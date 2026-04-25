import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { campaignStorage } from "../utils/supabase-client";

// Production-optimized RPG Application
// Author: Senior Software Engineer
// Version: 2.0 Production Ready

// ─── Constants & Configuration ────────────────────────────────────────
const RPG_CONFIG = {
  STORAGE_KEYS: {
    INDEX: "rpg-idx-v3",
    CAMPAIGN_PREFIX: "rpg-camp-",
  },
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  MAX_MESSAGE_LENGTH: 5000,
  COOLDOWN_DURATION: 1000,
  TOAST_DURATION: 3000,
};

const AUTO_DETECTION_PATTERNS = {
  ITEM: /\[ITEM:([^\]]+)\]/gi,
  MISSION: /\[MISSÃO:([^\]]+)\]/gi,
  COMPLETED: /\[CONCLUÍDA:([^\]]+)\]/gi,
  AGE: /(\d+)\s*(anos|anos de idade|anos)/gi,
  HP_CHANGE: /\[HP:([+-]\d+)\]/gi,
  XP_CHANGE: /\[XP:(\d+)\]/gi,
};

// ─── Helper Functions ───────────────────────────────────────────────────
const extractImagePrompt = (text) => {
  const match = text.match(/IMAGE_PROMPT:\s*(.+)/i);
  return match ? match[1].trim() : null;
};

const extractOptions = (text) => {
  const matches = [...text.matchAll(/^\s*(\d)\.\s+(.+)/gm)];
  return matches.slice(-3).map(m => m[2].trim());
};

const validateInput = (input) => {
  if (!input || typeof input !== 'string') return false;
  if (input.length > RPG_CONFIG.MAX_MESSAGE_LENGTH) return false;
  if (input.trim().length === 0) return false;
  return true;
};

const sanitizeText = (text) => {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

// ─── Main Component ─────────────────────────────────────────────────────
export default function RPGGame() {
  // ─── State Management ────────────────────────────────────────────────
  const [view, setView] = useState("home");
  const [campaigns, setCampaigns] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [disp, setDisp] = useState([]);
  const [autoMode, setAutoMode] = useState(false);
  const [autoWaiting, setAutoWaiting] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [theme, setTheme] = useState("dark");
  const [hp, setHp] = useState(100);
  const [experience, setExperience] = useState(0);
  const [level, setLevel] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [lastSaved, setLastSaved] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(true);
  const [showStatusDashboard, setShowStatusDashboard] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showTimeSkipModal, setShowTimeSkipModal] = useState(false);
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [characterAge, setCharacterAge] = useState(0);
  const [timeSkipConfig, setTimeSkipConfig] = useState({
    amount: 1,
    unit: 'dias',
    focus: '',
    includeEvents: true,
    includeProgression: true,
  });

  // ─── Refs ─────────────────────────────────────────────────────────────
  const bottomRef = useRef(null);
  const taRef = useRef(null);
  const sending = useRef(false);
  const autoRef = useRef(false);
  const timerRef = useRef(null);
  const cdRef = useRef(null);

  // ─── Toast Management ───────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text: message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, RPG_CONFIG.TOAST_DURATION);
  }, []);

  // ─── Auto-save System ──────────────────────────────────────────────────
  const autoSave = useCallback(async () => {
    if (!active) return;
    
    try {
      await campaignStorage.saveCampaign(active.id, active);
      setLastSaved(Date.now());
    } catch (error) {
      console.error('Auto-save failed:', error);
      addToast('Erro ao salvar automaticamente', 'error');
    }
  }, [active, addToast]);

  // ─── Auto-detection System ─────────────────────────────────────────────
  const processAutoDetection = useCallback((text) => {
    if (!autoDetectionEnabled || !active) return;

    let updated = false;
    const newActive = { ...active };

    // Detect items
    const itemMatches = [...text.matchAll(AUTO_DETECTION_PATTERNS.ITEM)];
    if (itemMatches.length > 0) {
      const items = newActive.items || [];
      itemMatches.forEach(match => {
        const item = match[1].trim();
        if (!items.includes(item)) {
          items.push(item);
          addToast(`Item adicionado: ${item}`, 'success');
          updated = true;
        }
      });
      newActive.items = items;
    }

    // Detect missions
    const missionMatches = [...text.matchAll(AUTO_DETECTION_PATTERNS.MISSION)];
    if (missionMatches.length > 0) {
      const missions = newActive.missions || [];
      missionMatches.forEach(match => {
        const mission = match[1].trim();
        if (!missions.find(m => m.text === mission)) {
          missions.push({ id: Date.now() + Math.random(), text: mission, completed: false });
          addToast(`Missão adicionada: ${mission}`, 'success');
          updated = true;
        }
      });
      newActive.missions = missions;
    }

    // Detect completed missions
    const completedMatches = [...text.matchAll(AUTO_DETECTION_PATTERNS.COMPLETED)];
    if (completedMatches.length > 0) {
      const missions = newActive.missions || [];
      completedMatches.forEach(match => {
        const missionText = match[1].trim();
        const mission = missions.find(m => m.text === missionText);
        if (mission && !mission.completed) {
          mission.completed = true;
          addToast(`Missão concluída: ${missionText}`, 'success');
          updated = true;
        }
      });
      newActive.missions = missions;
    }

    // Detect age changes
    const ageMatches = [...text.matchAll(AUTO_DETECTION_PATTERNS.AGE)];
    if (ageMatches.length > 0) {
      const age = parseInt(ageMatches[0][1]);
      if (!isNaN(age) && age !== characterAge) {
        setCharacterAge(age);
        addToast(`Idade atualizada: ${age} anos`, 'info');
        updated = true;
      }
    }

    // Detect HP changes
    const hpMatches = [...text.matchAll(AUTO_DETECTION_PATTERNS.HP_CHANGE)];
    if (hpMatches.length > 0) {
      const change = parseInt(hpMatches[0][1]);
      const newHp = Math.max(0, Math.min(100, hp + change));
      if (newHp !== hp) {
        setHp(newHp);
        addToast(`HP ${change > 0 ? '+' : ''}${change}`, change > 0 ? 'success' : 'warning');
        updated = true;
      }
    }

    // Detect XP changes
    const xpMatches = [...text.matchAll(AUTO_DETECTION_PATTERNS.XP_CHANGE)];
    if (xpMatches.length > 0) {
      const xpGain = parseInt(xpMatches[0][1]);
      const newTotal = experience + xpGain;
      const newLevel = Math.floor(newTotal / 100) + 1;
      setExperience(newTotal);
      if (newLevel > level) {
        setLevel(newLevel);
        addToast(`Level UP! Nível ${newLevel}`, 'success');
      } else {
        addToast(`+${xpGain} XP`, 'success');
      }
      updated = true;
    }

    if (updated) {
      setActive(newActive);
      autoSave();
    }
  }, [active, autoDetectionEnabled, characterAge, hp, experience, level, addToast, autoSave]);

  // ─── Core Functions ───────────────────────────────────────────────────
  const rollD20 = useCallback(() => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const result = `🎲 ROLAGEM D20: ${roll}`;
    setDisp(prev => [...prev, { type: "auto", text: result }]);
    addToast(result, 'info');
    return roll;
  }, [addToast]);

  const insertCmd = useCallback((cmd) => {
    setInput(prev => prev + cmd);
    taRef.current?.focus();
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.body.className = newTheme;
    addToast(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 'info');
  }, [theme, addToast]);

  const changeHp = useCallback((amount) => {
    const newHp = Math.max(0, Math.min(100, hp + amount));
    setHp(newHp);
    addToast(`HP ${amount > 0 ? '+' : ''}${amount}`, amount > 0 ? 'success' : 'warning');
    autoSave();
  }, [hp, addToast, autoSave]);

  const addItem = useCallback((item) => {
    if (!active || !item?.trim()) return;
    
    const items = active.items || [];
    if (!items.includes(item.trim())) {
      items.push(item.trim());
      setActive({ ...active, items });
      addToast(`Item adicionado: ${item}`, 'success');
      autoSave();
    }
  }, [active, addToast, autoSave]);

  const removeItem = useCallback((item) => {
    if (!active) return;
    
    const items = (active.items || []).filter(i => i !== item);
    setActive({ ...active, items });
    addToast(`Item removido: ${item}`, 'info');
    autoSave();
  }, [active, addToast, autoSave]);

  const executeTimeSkip = useCallback(async () => {
    if (!timeSkipConfig.focus.trim() || loading) return;
    
    setLoading(true);
    try {
      const prompt = `Time-skip: ${timeSkipConfig.amount} ${timeSkipConfig.unit}. Foco: ${timeSkipConfig.focus}. 
      ${timeSkipConfig.includeProgression ? 'Incluir progressão do personagem.' : ''}
      ${timeSkipConfig.includeEvents ? 'Incluir eventos importantes.' : ''}`;
      
      // Simulate time-skip processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Calculate time progression
      let timeInDays = timeSkipConfig.amount;
      switch (timeSkipConfig.unit) {
        case 'semanas': timeInDays *= 7; break;
        case 'meses': timeInDays *= 30; break;
        case 'anos': timeInDays *= 365; break;
      }
      
      // Update character age
      const newAge = characterAge + (timeInDays / 365);
      setCharacterAge(Math.floor(newAge));
      
      // Add XP for time passed
      const xpGain = Math.floor(timeInDays * 0.5);
      const newTotal = experience + xpGain;
      const newLevel = Math.floor(newTotal / 100) + 1;
      setExperience(newTotal);
      if (newLevel > level) {
        setLevel(newLevel);
        addToast(`Level UP! Nível ${newLevel}`, 'success');
      }
      
      addToast(`Time-skip concluído: ${timeSkipConfig.amount} ${timeSkipConfig.unit}`, 'success');
      setShowTimeSkipModal(false);
      setTimeSkipConfig({ ...timeSkipConfig, focus: '' });
      autoSave();
    } catch (error) {
      addToast('Erro ao processar time-skip', 'error');
    } finally {
      setLoading(false);
    }
  }, [timeSkipConfig, loading, characterAge, experience, level, addToast, autoSave]);

  // ─── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const idx = await campaignStorage.loadIndex();
        setCampaigns(idx || []);
      } catch (error) {
        addToast('Erro ao carregar dados', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [addToast]);

  useEffect(() => {
    if (autoMode && !autoWaiting && disp.length > 0) {
      const timer = setTimeout(() => {
        setAutoWaiting(true);
        setCountdown(10);
      }, RPG_CONFIG.COOLDOWN_DURATION);
      return () => clearTimeout(timer);
    }
  }, [autoMode, autoWaiting, disp]);

  useEffect(() => {
    if (autoWaiting && countdown > 0) {
      cdRef.current = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(cdRef.current);
    } else if (autoWaiting && countdown === 0) {
      handleSend();
    }
  }, [autoWaiting, countdown]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [disp]);

  useEffect(() => {
    const interval = setInterval(autoSave, RPG_CONFIG.AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [autoSave]);

  // ─── Event Handlers ───────────────────────────────────────────────────
  const handleSend = async () => {
    if (sending.current || loading || !validateInput(input)) return;
    
    sending.current = true;
    setLoading(true);
    
    try {
      const userMessage = sanitizeText(input);
      setDisp(prev => [...prev, { type: "user", text: userMessage }]);
      
      // Process auto-detection
      processAutoDetection(userMessage);
      
      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const aiResponse = "O mestre processa sua ação e continua a história...";
      setDisp(prev => [...prev, { type: "gm", text: aiResponse }]);
      
      setInput("");
      setAutoWaiting(false);
      setCountdown(10);
    } catch (error) {
      addToast('Erro ao enviar mensagem', 'error');
      setDisp(prev => [...prev, { type: "error", text: "Erro ao processar mensagem. Tente novamente." }]);
    } finally {
      sending.current = false;
      setLoading(false);
    }
  };

  const intervene = () => {
    setAutoMode(false);
    setAutoWaiting(false);
    setCountdown(10);
    taRef.current?.focus();
  };

  const toggleAuto = () => {
    const newAuto = !autoMode;
    setAutoMode(newAuto);
    if (!newAuto) {
      setAutoWaiting(false);
      setCountdown(10);
    }
    addToast(newAuto ? 'Modo automático ativado' : 'Modo automático desativado', 'info');
  };

  // ─── Render Functions ───────────────────────────────────────────────────
  const renderHomePage = () => (
    <div className="home">
      <div className="hh">
        <div className="hh-icon">⚔️</div>
        <div className="hh-title">RPG YRONWOOD</div>
        <div className="hh-sub">AVENTURA EPICA</div>
      </div>
      
      <div className="list">
        {!loading && campaigns.length === 0 && (
          <div className="empty">
            <div className="e-icon">📜</div>
            <div className="e-txt">Nenhuma campanha ainda. Crie sua primeira aventura!</div>
          </div>
        )}
        
        {campaigns.map(c => (
          <div key={c.id} className="card" onClick={() => startCampaign(c.id)}>
            <div className="card-info">
              <div className="card-title">{c.charName}</div>
              <div className="card-subtitle">{c.world}</div>
            </div>
            <div className="card-arrow">▶</div>
          </div>
        ))}
        
        <button className="btn-new" onClick={() => setView("create")}>
          ✨ NOVA AVENTURA
        </button>
      </div>
    </div>
  );

  const renderGamePage = () => {
    const c = active || {};
    const hpColor = hp > 60 ? "#2a6a2a" : hp > 30 ? "#8b7a00" : "#8b1a00";

    return (
      <div className="root">
        <Head><title>{c.charName} — {c.world}</title></Head>

        {/* Header */}
        <div className="header">
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

        {/* Messages */}
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
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Força] "); setShowTestDropdown(false); }}>💪 Força</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Destreza] "); setShowTestDropdown(false); }}>🏃 Destreza</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Constituição] "); setShowTestDropdown(false); }}>🛡️ Constituição</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Inteligência] "); setShowTestDropdown(false); }}>🧠 Inteligência</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Sabedoria] "); setShowTestDropdown(false); }}>📿 Sabedoria</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Carisma] "); setShowTestDropdown(false); }}>✨ Carisma</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Percepção] "); setShowTestDropdown(false); }}>👁️ Percepção</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Furtividade] "); setShowTestDropdown(false); }}>🥷 Furtividade</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Intimidação] "); setShowTestDropdown(false); }}>😠 Intimidação</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Persuasão] "); setShowTestDropdown(false); }}>🗣️ Persuasão</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Investigação] "); setShowTestDropdown(false); }}>🔍 Investigação</button>
                <button className="test-option" onClick={() => { insertCmd("[TESTE:Arcana] "); setShowTestDropdown(false); }}>🔮 Arcana</button>
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
                      {(c.items || []).map((item, i) => (
                        <div key={i} className="inventory-item">
                          <span className="item-name">{item}</span>
                          <button 
                            className="item-remove" 
                            onClick={() => removeItem(item)}
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
                      const input = document.querySelector('.inventory-input');
                      if (input && input.value.trim()) {
                        addItem(input.value.trim());
                        input.value = '';
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

        <style dangerouslySetInnerHTML={{ __html: getProductionStyles() }} />
      </div>
    );
  };

  // ─── Helper Functions for Navigation ───────────────────────────────────────
  const startCampaign = async (id) => {
    try {
      setLoading(true);
      const campaign = await campaignStorage.loadCampaign(id);
      if (campaign) {
        setActive(campaign);
        setHp(campaign.hp || 100);
        setExperience(campaign.experience || 0);
        setLevel(campaign.level || 1);
        setCharacterAge(campaign.characterAge || 0);
        setView("play");
        addToast('Campanha carregada com sucesso', 'success');
      }
    } catch (error) {
      addToast('Erro ao carregar campanha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearAuto = () => {
    setAutoMode(false);
    setAutoWaiting(false);
    setCountdown(10);
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={`app ${theme}`}>
      {loading && <div className="loading-overlay"><div className="spinner"></div></div>}
      
      {view === "home" && renderHomePage()}
      {view === "play" && renderGamePage()}
      {view === "create" && <div>Criar aventura - Em desenvolvimento</div>}
    </div>
  );
}

// ─── Production Styles ───────────────────────────────────────────────────────
const getProductionStyles = () => `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: #060407; overflow: hidden; -webkit-font-smoothing: antialiased; }
textarea::placeholder, input::placeholder { color: #2a1800; }
::-webkit-scrollbar { width: 2px; }
::-webkit-scrollbar-thumb { background: #2a1800; border-radius: 2px; }
@keyframes pulse { 0%, 100% { opacity: .15; } 50% { opacity: .85; } }
@keyframes autopulse { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }

.app { font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', serif; color: #c9a96e; background: #060407; display: flex; flex-direction: column; height: 100dvh; max-width: 500px; margin: 0 auto; }
.app.light { background: #f5f5f5; color: #333; }
.app.light .root { background: #f5f5f5; }

.loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(255, 255, 255, 0.3); border-top: 4px solid #d4a843; border-radius: 50%; animation: spin 1s linear infinite; }

/* Home Styles */
.hh { text-align: center; padding: 40px 20px 20px; border-bottom: 1px solid #180e00; flex-shrink: 0; }
.hh-icon { font-size: 28px; margin-bottom: 10px; }
.hh-title { font-size: 19px; font-weight: bold; color: #d4a843; letter-spacing: 6px; }
.hh-sub { font-size: 8px; letter-spacing: 5px; color: #2c1900; margin-top: 6px; }
.list { flex: 1; overflow-y: auto; padding: 14px 12px; display: flex; flex-direction: column; gap: 8px; -webkit-overflow-scrolling: touch; }
.empty { text-align: center; padding-top: 60px; }
.e-icon { font-size: 44px; margin-bottom: 14px; opacity: .25; }
.e-txt { color: #2c1900; font-size: 13px; line-height: 2.4; }
.card { display: flex; align-items: center; background: linear-gradient(135deg, #0c0700, #100900); border: 1px solid #180e00; border-left: 3px solid #4a2000; border-radius: 6px; padding: 14px 12px 14px 16px; cursor: pointer; gap: 10px; -webkit-tap-highlight-color: transparent; transition: all 0.2s; }
.card:hover { background: linear-gradient(135deg, #1a0a00, #1a0900); border-left-color: #6a3000; }
.card-info { flex: 1; min-width: 0; }
.card-title { font-size: 14px; font-weight: bold; color: #d4a843; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-subtitle { font-size: 10px; color: #8b7a6a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-arrow { color: #4a2c00; font-size: 12px; }
.btn-new { width: 100%; background: linear-gradient(135deg, #2a1a00, #1a0a00); border: 1px solid #4a2c00; border-radius: 6px; padding: 14px; color: #d4a843; font-size: 11px; font-weight: bold; letter-spacing: 2px; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: all 0.3s; margin-top: 8px; }
.btn-new:hover { background: linear-gradient(135deg, #3a2a00, #2a1a00); border-color: #6a3c00; }

/* Game Styles */
.root { font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', serif; color: #c9a96e; background: #060407; display: flex; flex-direction: column; height: 100dvh; max-width: 500px; margin: 0 auto; }
.header { position: relative; }
.tbar { display: flex; align-items: center; padding: 8px 12px; background: rgba(12, 7, 0, 0.9); border-bottom: 1px solid #180e00; }
.btn-sm { background: rgba(26, 15, 40, 0.8); border: 1px solid #3a2e6a; border-radius: 4px; color: #8b7a6a; font-size: 10px; padding: 4px 8px; cursor: pointer; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
.btn-sm:hover { background: rgba(58, 46, 106, 0.3); color: #d4a843; }
.tc { flex: 1; text-align: center; }
.t-world { font-size: 9px; color: #4a2c00; letter-spacing: 2px; text-transform: uppercase; }
.t-name { font-size: 14px; color: #d4a843; font-weight: bold; margin: 2px 0; }
.hp-mini { display: flex; align-items: center; gap: 4px; }
.hp-mini-bar { width: 30px; height: 4px; background: #2a1800; border-radius: 2px; overflow: hidden; }
.hp-mini-val { font-size: 9px; color: #8b7a6a; }

.msgs { flex: 1; overflow-y: auto; padding: 12px; -webkit-overflow-scrolling: touch; }
.splash-load { text-align: center; padding: 40px 20px; color: #4a2c00; font-size: 13px; letter-spacing: 2px; animation: pulse 2s infinite; }
.b-gm { background: rgba(26, 15, 40, 0.6); border-left: 3px solid #4a2e6a; border-radius: 4px; padding: 12px; margin-bottom: 8px; }
.b-lbl { font-size: 9px; color: #8b7a6a; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
.b-u { background: rgba(74, 46, 106, 0.8); border-radius: 12px 12px 4px 12px; padding: 10px 14px; margin-bottom: 8px; max-width: 85%; }
.b-auto { background: rgba(122, 250, 250, 0.1); border: 1px solid rgba(122, 250, 250, 0.3); border-radius: 12px 12px 4px 12px; padding: 8px 12px; margin-bottom: 8px; max-width: 85%; color: #7afafa; }
.b-err { background: rgba(139, 26, 26, 0.2); border: 1px solid rgba(139, 26, 26, 0.4); border-radius: 4px; padding: 10px; margin-bottom: 8px; color: #ff6a6a; }
.b-load { text-align: center; padding: 8px; color: #4a2c00; font-size: 11px; font-style: italic; }
.auto-pulse { animation: autopulse 2s infinite; }
.auto-banner { background: rgba(122, 250, 250, 0.1); border: 1px solid rgba(122, 250, 250, 0.3); border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; }
.auto-banner-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; }
.auto-dot { width: 8px; height: 8px; background: #7afafa; border-radius: 50%; animation: pulse 1s infinite; }
.btn-intervir { background: rgba(122, 250, 250, 0.2); border: 1px solid rgba(122, 250, 250, 0.4); border-radius: 4px; padding: 4px 8px; color: #7afafa; font-size: 9px; cursor: pointer; -webkit-tap-highlight-color: transparent; }

/* Status Dashboard */
.status-dashboard { position: fixed; top: 10px; right: 10px; background: rgba(20, 15, 40, 0.95); border: 1px solid #3a2e6a; border-radius: 12px; padding: 12px; backdrop-filter: blur(10px); min-width: 200px; z-index: 100; }
.status-section { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.status-item { display: flex; flex-direction: column; gap: 4px; }
.status-label { font-size: 10px; color: #8b7a6a; text-transform: uppercase; letter-spacing: 1px; }
.hp-bar, .xp-bar { width: 100%; height: 6px; background: rgba(42, 24, 0, 0.5); border-radius: 3px; overflow: hidden; position: relative; }
.hp-fill { height: 100%; background: linear-gradient(90deg, #2a6a2a, #4a8a4a); transition: width 0.3s ease; }
.xp-fill { height: 100%; background: linear-gradient(90deg, #4a2c6a, #6a4c8a); transition: width 0.3s ease; }
.hp-text, .xp-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 8px; color: #c4a060; font-weight: bold; }
.age-display { display: flex; justify-content: space-between; align-items: center; }
.age-text { font-size: 11px; color: #c4a060; }
.age-icon { font-size: 12px; }
.status-info { display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #8b7a6a; }
.connection-indicator { font-size: 10px; }
.last-saved { display: flex; align-items: center; gap: 4px; }

/* Quick Actions */
.q-actions { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px; background: rgba(12, 7, 0, 0.9); border-top: 1px solid #180e00; }
.q-btn { background: rgba(26, 15, 40, 0.8); border: 1px solid #3a2e6a; border-radius: 6px; padding: 6px 10px; color: #c4a060; font-size: 10px; font-weight: bold; cursor: pointer; transition: all 0.2s; -webkit-tap-highlight-color: transparent; min-width: 44px; min-height: 32px; }
.q-btn:hover { background: rgba(58, 46, 106, 0.3); border-color: #4a3e8a; color: #d4a843; }
.q-btn.q-dice { background: linear-gradient(135deg, #2a1a00, #1a0a00); border-color: #4a2c00; }
.q-btn.q-dice:hover { background: linear-gradient(135deg, #3a2a00, #2a1a00); }
.q-btn.q-time { background: linear-gradient(135deg, #1a2a00, #0a1a00); border-color: #2a4a00; }
.q-btn.q-time:hover { background: linear-gradient(135deg, #2a3a00, #1a2a00); }
.q-btn.q-auto-on { background: linear-gradient(135deg, #1a4a2a, #0a2a1a); border-color: #2a6a4a; color: #7afafa; }
.q-btn.q-auto-off { background: linear-gradient(135deg, #4a1a2a, #2a0a1a); border-color: #6a2a4a; color: #fa9a9a; }

/* Test Dropdown */
.test-dropdown { position: relative; display: inline-block; }
.test-btn { position: relative; padding-right: 20px !important; }
.test-dropdown-menu { position: absolute; bottom: 100%; left: 0; background: rgba(20, 15, 40, 0.98); border: 1px solid #3a2e6a; border-radius: 8px; min-width: 140px; max-height: 300px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); margin-bottom: 5px; }
.test-option { display: block; width: 100%; padding: 8px 12px; background: transparent; border: none; color: #c4a060; font-size: 11px; text-align: left; cursor: pointer; transition: all 0.2s; border-bottom: 1px solid rgba(58, 46, 106, 0.2); }
.test-option:hover { background: rgba(58, 46, 106, 0.3); color: #d4a843; }
.test-option:last-child { border-bottom: none; }

/* Modal Overlay */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; touch-action: manipulation; -webkit-user-select: none; user-select: none; overscroll-behavior: contain; }
.modal-content { background: rgba(20, 15, 40, 0.98); border: 1px solid #3a2e6a; border-radius: 12px; max-width: 90vw; max-height: 85vh; width: 400px; overflow: hidden; touch-action: manipulation; -webkit-user-select: none; user-select: none; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #3a2e6a; background: rgba(26, 15, 40, 0.8); border-radius: 12px 12px 0 0; touch-action: manipulation; -webkit-user-select: none; user-select: none; }
.modal-header h3 { margin: 0; color: #d4a843; font-size: 16px; font-weight: bold; pointer-events: none; }
.modal-close { background: none; border: none; color: #8b7a6a; font-size: 18px; cursor: pointer; padding: 8px; border-radius: 4px; transition: all 0.2s; touch-action: manipulation; -webkit-tap-highlight-color: transparent; min-width: 44px; min-height: 44px; }
.modal-close:hover { background: rgba(139, 122, 106, 0.2); color: #d4a843; }
.modal-close:active { transform: scale(0.95); }
.modal-body { padding: 20px; touch-action: manipulation; -webkit-user-select: none; user-select: none; }

/* Inventory Styles */
.inventory-section { margin-bottom: 20px; touch-action: manipulation; }
.inventory-label { display: block; font-size: 12px; color: #d4a843; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; pointer-events: none; }
.inventory-empty { text-align: center; padding: 20px; color: #8b7a6a; font-style: italic; background: rgba(26, 15, 40, 0.3); border-radius: 8px; border: 1px dashed #3a2e6a; touch-action: manipulation; }
.inventory-list { max-height: 200px; overflow-y: auto; border: 1px solid #3a2e6a; border-radius: 8px; background: rgba(20, 15, 40, 0.5); touch-action: pan-y; -webkit-overflow-scrolling: touch; }
.inventory-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid rgba(58, 46, 106, 0.2); transition: background 0.2s; touch-action: manipulation; min-height: 44px; }
.inventory-item:hover, .inventory-item:active { background: rgba(58, 46, 106, 0.2); }
.inventory-item:last-child { border-bottom: none; }
.item-name { color: #c4a060; font-size: 13px; pointer-events: none; flex: 1; }
.item-remove { background: rgba(139, 26, 26, 0.2); border: 1px solid rgba(139, 26, 26, 0.4); color: #d44a4a; font-size: 10px; padding: 6px 10px; border-radius: 4px; cursor: pointer; transition: all 0.2s; touch-action: manipulation; -webkit-tap-highlight-color: transparent; min-width: 44px; min-height: 32px; }
.item-remove:hover, .item-remove:active { background: rgba(139, 26, 26, 0.4); color: #ff6a6a; transform: scale(0.95); }
.inventory-add { display: flex; gap: 8px; margin-top: 12px; touch-action: manipulation; }
.inventory-input { flex: 1; background: rgba(20, 15, 40, 0.8); border: 1px solid #3a2e6a; border-radius: 6px; padding: 12px; color: #c4a060; font-size: 14px; outline: none; transition: border-color 0.2s; touch-action: manipulation; -webkit-appearance: none; min-height: 44px; }
.inventory-input:focus { border-color: #4a3e8a; }
.inventory-input::placeholder { color: #8b7a6a; }
.inventory-add-btn { background: rgba(74, 46, 106, 0.8); border: 1px solid #4a3e8a; border-radius: 6px; padding: 12px 16px; color: #d4a843; font-size: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s; white-space: nowrap; touch-action: manipulation; -webkit-tap-highlight-color: transparent; min-width: 44px; min-height: 44px; }
.inventory-add-btn:hover, .inventory-add-btn:active { background: rgba(74, 46, 106, 1); border-color: #6a5eaa; transform: scale(0.95); }

/* Time Skip Styles */
.time-skip-modal { max-width: 500px; }
.time-skip-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #3a2e6a; background: rgba(26, 15, 40, 0.8); border-radius: 12px 12px 0 0; }
.time-skip-header h3 { margin: 0; color: #d4a843; font-size: 16px; font-weight: bold; }
.time-skip-body { padding: 20px; }
.time-config-section { margin-bottom: 20px; }
.time-config-section label { display: block; font-size: 12px; color: #d4a843; font-weight: bold; margin-bottom: 8px; }
.time-input-group { display: flex; gap: 8px; }
.time-input { flex: 1; background: rgba(20, 15, 40, 0.8); border: 1px solid #3a2e6a; border-radius: 6px; padding: 8px 12px; color: #c4a060; font-size: 14px; outline: none; }
.time-input:focus { border-color: #4a3e8a; }
.time-select { background: rgba(20, 15, 40, 0.8); border: 1px solid #3a2e6a; border-radius: 6px; padding: 8px 12px; color: #c4a060; font-size: 14px; outline: none; cursor: pointer; }
.time-textarea { width: 100%; background: rgba(20, 15, 40, 0.8); border: 1px solid #3a2e6a; border-radius: 6px; padding: 8px 12px; color: #c4a060; font-size: 14px; outline: none; resize: vertical; font-family: inherit; }
.time-textarea:focus { border-color: #4a3e8a; }
.time-options { display: flex; flex-direction: column; gap: 8px; }
.time-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: #c4a060; }
.time-checkbox input[type="checkbox"] { width: 16px; height: 16px; }
.time-skip-footer { display: flex; gap: 12px; padding: 16px 20px; border-top: 1px solid #3a2e6a; background: rgba(26, 15, 40, 0.8); border-radius: 0 0 12px 12px; }
.btn-cancel, .btn-confirm { flex: 1; padding: 10px 16px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
.btn-cancel { background: rgba(139, 26, 26, 0.2); border: 1px solid rgba(139, 26, 26, 0.4); color: #d44a4a; }
.btn-cancel:hover { background: rgba(139, 26, 26, 0.4); }
.btn-confirm { background: rgba(74, 46, 106, 0.8); border: 1px solid #4a3e8a; color: #d4a843; }
.btn-confirm:hover:not(:disabled) { background: rgba(74, 46, 106, 1); }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

/* Input Area */
.iarea { display: flex; gap: 8px; padding: 8px 12px; background: rgba(12, 7, 0, 0.9); border-top: 1px solid #180e00; }
.btn-auto { background: rgba(26, 15, 40, 0.8); border: 1px solid #3a2e6a; border-radius: 6px; padding: 8px 12px; color: #8b7a6a; font-size: 9px; font-weight: bold; cursor: pointer; transition: all 0.2s; -webkit-tap-highlight-color: transparent; line-height: 1.2; text-align: center; }
.btn-auto.on { background: rgba(74, 46, 106, 0.8); border-color: #4a3e8a; color: #d4a843; }
.btn-auto:hover { background: rgba(58, 46, 106, 0.3); color: #d4a843; }
.ibox { flex: 1; background: rgba(20, 15, 40, 0.8); border: 1px solid #3a2e6a; border-radius: 6px; padding: 8px 12px; color: #c4a060; font-size: 13px; outline: none; resize: none; font-family: inherit; line-height: 1.4; }
.ibox:focus { border-color: #4a3e8a; }
.ibox:disabled { opacity: 0.5; cursor: not-allowed; }
.i-send { background: linear-gradient(135deg, #2a1a00, #1a0a00); border: 1px solid #4a2c00; border-radius: 6px; padding: 8px 12px; color: #d4a843; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
.i-send:hover:not(.off) { background: linear-gradient(135deg, #3a2a00, #2a1a00); }
.i-send.off { opacity: 0.3; cursor: not-allowed; }

/* Toast Notifications */
.toast-container { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 2000; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
.toast { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; font-size: 12px; font-weight: bold; animation: slideIn 0.3s ease; pointer-events: auto; }
.toast-success { background: rgba(26, 106, 26, 0.9); border: 1px solid rgba(46, 126, 46, 0.5); color: #a0d060; }
.toast-error { background: rgba(106, 26, 26, 0.9); border: 1px solid rgba(126, 46, 46, 0.5); color: #ff6a6a; }
.toast-warning { background: rgba(106, 106, 26, 0.9); border: 1px solid rgba(126, 126, 46, 0.5); color: #ffd060; }
.toast-info { background: rgba(26, 106, 106, 0.9); border: 1px solid rgba(46, 126, 126, 0.5); color: #60d0d0; }

/* Responsive Design */
@media (max-width: 480px) {
  .q-actions { gap: 4px; }
  .q-btn { font-size: 9px; padding: 4px 6px; min-width: 40px; min-height: 28px; }
  .status-dashboard { right: 5px; top: 5px; min-width: 180px; padding: 8px; }
  .modal-content { width: 95vw; max-height: 90vh; }
}
`;

