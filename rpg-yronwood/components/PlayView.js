import Head from "next/head";
import { fmtTime, attrMod, relationClass, hpColor } from "../lib/rpg-ui-helpers";

const PANEL_META = {
  narrator: { label: "Narrador", icon: "ti ti-message-2" },
  sheet: { label: "Ficha", icon: "ti ti-user-circle" },
  dice: { label: "Dados", icon: "ti ti-dice-5" },
  inventory: { label: "Inventário", icon: "ti ti-backpack" },
  missions: { label: "Missões", icon: "ti ti-flag-3" },
  settings: { label: "Ajustes", icon: "ti ti-settings" },
};

const ATTR_LABELS = {
  strength: "Força",
  dexterity: "Destreza",
  mind: "Mente",
  charisma: "Carisma",
  constitution: "Constituição",
  intelligence: "Inteligência",
  wisdom: "Sabedoria",
};

const SKILL_LABELS = {
  combat: "Combate",
  stealth: "Furtividade",
  magic: "Magia",
  persuasion: "Persuasão",
  survival: "Sobrevivência",
  perception: "Percepção",
};

const TOAST_ICONS = {
  success: "ti ti-circle-check",
  error: "ti ti-alert-circle",
  warning: "ti ti-alert-triangle",
  info: "ti ti-info-circle",
};

const TIME_XP_RATES = { dias: 5, semanas: 25, meses: 100, anos: 500 };

function renderMessageTime(message) {
  return fmtTime(message?.ts || message?.time || message?.createdAt || message?.timestamp);
}

function getPanelSubtitle(panel, loading, statusText, connectionStatus, c, lastSaved) {
  if (panel === "narrator" && loading) return statusText || "O narrador está escrevendo...";
  if (panel === "settings") return `Conexão ${connectionStatus || "desconhecida"}${lastSaved ? ` · salvo às ${fmtTime(lastSaved)}` : ""}`;
  if (panel === "sheet" && c?.charTitle) return c.charTitle;
  if (panel === "missions") return "Acompanhe objetivos ativos e concluídos.";
  if (panel === "inventory") return "Itens carregados pelo personagem.";
  if (panel === "dice") return "Role dados manuais a qualquer momento.";
  return c?.world || "A aventura continua.";
}

export default function PlayView(props) {
  const {
    active,
    disp,
    loading,
    statusText,
    sceneImg,
    imgOk,
    setImgOk,
    hp,
    level,
    experience,
    attributes,
    skills,
    missions,
    characterAge,
    input,
    setInput,
    autoMode,
    autoWaiting,
    countdown,
    showRollButton,
    lastRoll,
    playPanel,
    setPlayPanel,
    diceHistory,
    diceNum,
    diceLabel,
    invInput,
    setInvInput,
    theme,
    soundEnabled,
    setSoundEnabled,
    autoDetectionEnabled,
    setAutoDetectionEnabled,
    autoSaveEnabled,
    setAutoSaveEnabled,
    connectionStatus,
    lastSaved,
    showTimeSkipModal,
    setShowTimeSkipModal,
    timeSkipConfig,
    setTimeSkipConfig,
    toasts,
    bottomRef,
    taRef,
    GAME_STYLES,
    activeMissions,
    doneMissions,
    clearAuto,
    setView,
    toggleAuto,
    quickSave,
    handleSend,
    rollD20,
    rollDiceSides,
    rollDiceMultiple,
    changeHp,
    handleLevelUp,
    addItem,
    removeItem,
    useItem,
    toggleTheme,
    executeTimeSkip,
    exportToBook,
    saveSlot,
    loadSlot,
    resetChat,
    insertCmd,
    intervene,
  } = props;

  const c = active || {};
  const panel = PANEL_META[playPanel] || PANEL_META.narrator;
  const hpPct = Math.max(0, Math.min(100, Number(hp) || 0));
  const xpPct = Math.max(0, Math.min(100, Number(experience) % 100 || 0));
  const itemList = c.items || [];
  const relationshipEntries = Object.entries(c.relationships || {});
  const saveList = c.saves || [];
  const styleMeta = GAME_STYLES?.[c.gameStyle];
  const missionTotal = Array.isArray(missions) ? missions.length : 0;
  const activeMissionList = Array.isArray(activeMissions) ? activeMissions : [];
  const doneMissionList = Array.isArray(doneMissions) ? doneMissions : [];
  const panelSubtitle = getPanelSubtitle(panel.label.toLowerCase() === "narrador" ? "narrator" : playPanel, loading, statusText, connectionStatus, c, lastSaved);
  const attributeEntries = Object.entries(attributes || {});
  const skillEntries = Object.entries(skills || {});
  const estimatedXp = (timeSkipConfig?.amount || 0) * (TIME_XP_RATES[timeSkipConfig?.unit] || 5);

  const navItems = [
    { id: "narrator", badge: null },
    { id: "sheet", badge: null },
    { id: "dice", badge: null },
    { id: "inventory", badge: itemList.length || null },
    { id: "missions", badge: activeMissionList.length || missionTotal || null },
    { id: "settings", badge: null },
  ];

  const sendInventoryItem = () => {
    const trimmed = (invInput || "").trim();
    if (!trimmed) return;
    addItem(trimmed);
    setInvInput("");
  };

  return (
    <div className="play-wrap" data-theme={theme}>
      <Head>
        <title>{c.charName ? `${c.charName} — ${c.world || "RPG"}` : "RPG"}</title>
      </Head>

      <div className="rpg-app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>
              <i className="ti ti-sword" />
              <span style={{ display: "inline", marginTop: 0, color: "inherit" }}>RPG App</span>
            </h1>
            <span>{c.world || "Campanha ativa"}</span>
          </div>

          {navItems.map(({ id, badge }) => (
            <button
              key={id}
              className={`nav-item ${playPanel === id ? "active" : ""}`}
              onClick={() => setPlayPanel(id)}
              type="button"
            >
              <i className={PANEL_META[id].icon} />
              <span>{PANEL_META[id].label}</span>
              {badge ? <span className="nav-badge">{badge}</span> : null}
            </button>
          ))}

          <div className="sidebar-spacer" />

          <div className="char-mini">
            <div className="char-mini-name">{c.charName || "Aventureiro"}</div>
            <div className="char-mini-class">{c.charTitle || styleMeta?.label || "Em jornada"}</div>
            <div className="hp-bar-wrap">
              <div className="hp-bar">
                <div className="hp-fill" style={{ width: `${hpPct}%`, background: hpColor(hpPct) }} />
              </div>
              <div className="hp-label">{hpPct}/100</div>
            </div>
          </div>
        </aside>

        <div className="main">
          <div className="main-topbar">
            <button
              className="topbar-btn"
              onClick={() => {
                clearAuto();
                setView("home");
              }}
              type="button"
              title="Voltar"
            >
              <i className="ti ti-home" />
            </button>

            <div className="main-topbar-title">
              <h2>{panel.label}</h2>
              <p>{panelSubtitle}</p>
            </div>

            <button
              className={`topbar-btn ${autoMode ? "on" : ""}`}
              onClick={toggleAuto}
              type="button"
              title={autoMode ? "Desativar modo automático" : "Ativar modo automático"}
            >
              <i className="ti ti-player-track-next" />
            </button>

            <button className="topbar-btn" onClick={quickSave} type="button" title="Salvar rápido">
              <i className="ti ti-device-floppy" />
            </button>
          </div>

          {playPanel === "narrator" && c.useImages && sceneImg ? (
            <div className="scene-banner">
              <img
                src={sceneImg}
                alt={`Cena em ${c.world || "aventura"}`}
                className={imgOk ? "loaded" : ""}
                onLoad={() => setImgOk(true)}
              />
              <div className="scene-banner-overlay" />
              {!imgOk ? <div className="scene-banner-loading">GERANDO CENA</div> : null}
            </div>
          ) : null}

          <div className={`panel panel-chat ${playPanel === "narrator" ? "active" : ""}`}>
            <div className="chat-area">
              {autoWaiting && !loading ? (
                <div className="auto-banner">
                  <div className="auto-banner-top">
                    <span className="auto-dot" />
                    <span>
                      Modo automático ativo. Próximo turno em <strong>{countdown}s</strong>.
                    </span>
                  </div>
                  <button className="btn-intervir" onClick={intervene} type="button">
                    Intervir agora
                  </button>
                </div>
              ) : null}

              <div className="chat-messages">
                {!disp?.length && loading ? <div className="splash-load">{statusText || "INICIANDO A AVENTURA"}</div> : null}

                {(disp || []).map((message, index) => {
                  const isUser = message?.type === "user" || message?.type === "auto";
                  const isAuto = message?.type === "auto";
                  const isError = message?.type === "error";
                  const timeLabel = renderMessageTime(message);

                  return (
                    <div
                      key={message?.id || `${message?.type || "msg"}-${index}`}
                      className={`msg ${isUser ? "user" : ""} ${isAuto ? "auto" : ""} ${isError ? "error" : ""}`}
                    >
                      <div className={`msg-avatar ${isUser ? "" : "narrator"}`}>
                        <i className={isUser ? "ti ti-user" : "ti ti-sparkles"} />
                      </div>
                      <div>
                        <div className="msg-bubble">{message?.text || ""}</div>
                        {timeLabel ? <div className="msg-time">{timeLabel}</div> : null}
                      </div>
                    </div>
                  );
                })}

                {loading && disp?.length ? (
                  <div className="typing-row">
                    <div className="msg-avatar narrator">
                      <i className="ti ti-sparkles" />
                    </div>
                    <div className="typing-indicator" title={statusText || "Narrando..."}>
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                ) : null}

                <div ref={bottomRef} />
              </div>

              <div className="chat-input-row">
                <button
                  className={`btn-auto-toggle ${autoMode ? "on" : ""}`}
                  onClick={toggleAuto}
                  type="button"
                  title="Alternar modo automático"
                >
                  {autoMode ? "AUTO ON" : "AUTO OFF"}
                </button>

                <textarea
                  ref={taRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading || autoWaiting}
                  placeholder={autoMode ? "Interrompa o auto para agir manualmente." : `O que ${c.charName || "o personagem"} faz agora?`}
                  rows={2}
                />

                {showRollButton ? (
                  <button className="btn-roll" onClick={rollD20} type="button" title="Rolar d20">
                    {lastRoll || "D20"}
                  </button>
                ) : null}

                <button
                  className="send-btn"
                  onClick={handleSend}
                  disabled={loading || autoWaiting || !input?.trim()}
                  type="button"
                  title="Enviar ação"
                >
                  <i className="ti ti-send-2" />
                </button>
              </div>
            </div>
          </div>

          <div className={`panel ${playPanel === "sheet" ? "active" : ""}`}>
            <div>
              <div className="panel-title">Ficha do personagem</div>
              <div className="panel-sub">{c.charName || "Herói sem nome"}{c.charTitle ? ` · ${c.charTitle}` : ""}</div>
            </div>

            <div className="card-box">
              <div className="section-label">Vida e progresso</div>
              <div className="two-col">
                <div>
                  <div className="hp-bar-wrap" style={{ marginBottom: 10 }}>
                    <div className="hp-bar">
                      <div className="hp-fill" style={{ width: `${hpPct}%`, background: hpColor(hpPct) }} />
                    </div>
                    <span className="hp-label">{hpPct}/100</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="hp-ctrl-btn" onClick={() => changeHp(-10)} type="button" title="Perder 10 HP">
                      <i className="ti ti-minus" />
                    </button>
                    <button className="hp-ctrl-btn" onClick={() => changeHp(-1)} type="button" title="Perder 1 HP">
                      <i className="ti ti-chevron-down" />
                    </button>
                    <button className="hp-ctrl-btn" onClick={() => changeHp(1)} type="button" title="Ganhar 1 HP">
                      <i className="ti ti-chevron-up" />
                    </button>
                    <button className="hp-ctrl-btn" onClick={() => changeHp(10)} type="button" title="Ganhar 10 HP">
                      <i className="ti ti-plus" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="xp-bar-wrap" style={{ marginBottom: 10 }}>
                    <div className="xp-bar">
                      <div className="xp-fill" style={{ width: `${xpPct}%` }} />
                    </div>
                    <span className="xp-label">{xpPct}/100 XP</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span className="skill-val">Nível {level || 1}</span>
                    <button className="inventory-add-btn" onClick={handleLevelUp} type="button">
                      Subir de nível
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="stat-grid">
              {attributeEntries.map(([key, value]) => (
                <div key={key} className="stat-card">
                  <div className="stat-label">{ATTR_LABELS[key] || key}</div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-mod">{attrMod(Number(value) || 0)}</div>
                </div>
              ))}
            </div>

            <div className="two-col">
              <div className="card-box">
                <div className="section-label">Resumo</div>
                <div className="skill-list">
                  <div className="skill-row">
                    <span className="skill-dot prof" />
                    <span className="skill-name">Idade</span>
                    <span className="skill-val">{Math.floor(Number(characterAge) || 0)} anos</span>
                  </div>
                  <div className="skill-row">
                    <span className="skill-dot prof" />
                    <span className="skill-name">Estilo</span>
                    <span className="skill-val">{styleMeta?.label || "Padrão"}</span>
                  </div>
                  <div className="skill-row">
                    <span className="skill-dot prof" />
                    <span className="skill-name">Experiência total</span>
                    <span className="skill-val">{experience || 0}</span>
                  </div>
                </div>
                {c.charBg ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="section-label">História</div>
                    <div className="panel-sub" style={{ lineHeight: 1.7, marginTop: 0 }}>{c.charBg}</div>
                  </div>
                ) : null}
                {c.charSkills ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="section-label">Talentos narrativos</div>
                    <div className="panel-sub" style={{ lineHeight: 1.7, marginTop: 0 }}>{c.charSkills}</div>
                  </div>
                ) : null}
              </div>

              <div className="card-box">
                <div className="section-label">Perícias</div>
                <div className="skill-list">
                  {skillEntries.length ? (
                    skillEntries.map(([key, value]) => (
                      <div key={key} className="skill-row">
                        <span className={`skill-dot ${Number(value) > 1 ? "prof" : ""}`} />
                        <span className="skill-name">{SKILL_LABELS[key] || key}</span>
                        <span className="skill-val">{value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="panel-sub">Nenhuma perícia registrada.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="card-box">
              <div className="section-label">Relações</div>
              {relationshipEntries.length ? (
                relationshipEntries.map(([name, attitude]) => (
                  <div key={name} className="relation-row">
                    <span className="relation-name">{name}</span>
                    <span className={`relation-attitude ${relationClass(attitude)}`}>{attitude}</span>
                  </div>
                ))
              ) : (
                <div className="panel-sub">Nenhuma relação importante registrada.</div>
              )}
            </div>
          </div>

          <div className={`panel ${playPanel === "dice" ? "active" : ""}`}>
            <div>
              <div className="panel-title">Rolagem de dados</div>
              <div className="panel-sub">Use dados individuais ou combinações rápidas.</div>
            </div>

            <div className="dice-result">
              <div className="dice-result-num">{diceNum ?? lastRoll ?? "-"}</div>
              <div className="dice-result-label">{diceLabel || "Escolha um dado abaixo"}</div>
            </div>

            <div className="dice-grid">
              {[4, 6, 8, 10, 12, 20].map((sides) => (
                <button key={sides} className="dice-btn" onClick={() => rollDiceSides(sides)} type="button">
                  d{sides}
                </button>
              ))}
              <button className="dice-btn" onClick={() => rollDiceMultiple(2, 6)} type="button">2d6</button>
              <button className="dice-btn" onClick={() => rollDiceMultiple(3, 6)} type="button">3d6</button>
            </div>

            <button className="inventory-add-btn" onClick={rollD20} type="button">
              Rolar d20 narrativo
            </button>

            <div className="card-box">
              <div className="section-label">Histórico</div>
              <div className="dice-history">
                {(diceHistory || []).length ? (
                  diceHistory.map((entry, index) => (
                    <span key={`${entry?.die || "dado"}-${entry?.val || 0}-${index}`} className="dice-chip">
                      {entry?.die}: {entry?.val}
                    </span>
                  ))
                ) : (
                  <span className="panel-sub">Nenhuma rolagem ainda.</span>
                )}
              </div>
            </div>
          </div>

          <div className={`panel ${playPanel === "inventory" ? "active" : ""}`}>
            <div>
              <div className="panel-title">Inventário</div>
              <div className="panel-sub">{itemList.length} item(ns) carregado(s) nesta campanha.</div>
            </div>

            <div className="inventory-add">
              <input
                className="inventory-input"
                value={invInput}
                onChange={(event) => setInvInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendInventoryItem();
                  }
                }}
                placeholder="Adicionar item ao inventário..."
              />
              <button className="inventory-add-btn" onClick={sendInventoryItem} type="button">
                Adicionar
              </button>
            </div>

            {itemList.length ? (
              <div className="equip-list">
                {itemList.map((item, index) => (
                  <div key={`${item}-${index}`} className="equip-item">
                    <i className="ti ti-package equip-icon" />
                    <span className="equip-name">{item}</span>
                    <span className="equip-tag">Item</span>
                    <div className="equip-actions">
                      <button className="equip-btn use" onClick={() => useItem(item)} type="button" title="Usar item">
                        <i className="ti ti-play" />
                      </button>
                      <button className="equip-btn danger" onClick={() => removeItem(index)} type="button" title="Remover item">
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="inventory-empty">Nenhum item encontrado.</div>
            )}
          </div>

          <div className={`panel ${playPanel === "missions" ? "active" : ""}`}>
            <div>
              <div className="panel-title">Missões</div>
              <div className="panel-sub">Objetivos em andamento e concluídos.</div>
            </div>

            <div className="card-box">
              <div className="section-label">Ativas</div>
              <div className="mission-list">
                {activeMissionList.length ? (
                  activeMissionList.map((mission, index) => (
                    <div key={mission?.id || `active-${index}`} className="mission-item">
                      <div className="mission-check">
                        <i className="ti ti-point-filled" />
                      </div>
                      <div className="mission-text">{mission?.text}</div>
                    </div>
                  ))
                ) : (
                  <div className="panel-sub">Nenhuma missão ativa no momento.</div>
                )}
              </div>
            </div>

            <div className="card-box">
              <div className="section-label">Concluídas</div>
              <div className="mission-list">
                {doneMissionList.length ? (
                  doneMissionList.map((mission, index) => (
                    <div key={mission?.id || `done-${index}`} className="mission-item done">
                      <div className="mission-check">
                        <i className="ti ti-check" />
                      </div>
                      <div className="mission-text">{mission?.text}</div>
                    </div>
                  ))
                ) : (
                  <div className="panel-sub">Nenhuma missão concluída ainda.</div>
                )}
              </div>
            </div>
          </div>

          <div className={`panel ${playPanel === "settings" ? "active" : ""}`}>
            <div>
              <div className="panel-title">Configurações e ferramentas</div>
              <div className="panel-sub">Ajuste a experiência e acesse ações da campanha.</div>
            </div>

            <div className="settings-list">
              <div className="settings-item">
                <div className="settings-item-label">
                  <i className="ti ti-volume" />
                  <span>Sons</span>
                </div>
                <button className={`settings-toggle ${soundEnabled ? "on" : ""}`} onClick={() => setSoundEnabled(!soundEnabled)} type="button">
                  {soundEnabled ? "Ligado" : "Desligado"}
                </button>
              </div>

              <div className="settings-item">
                <div className="settings-item-label">
                  <i className="ti ti-robot" />
                  <span>Auto-detecção</span>
                </div>
                <button
                  className={`settings-toggle ${autoDetectionEnabled ? "on" : ""}`}
                  onClick={() => setAutoDetectionEnabled(!autoDetectionEnabled)}
                  type="button"
                >
                  {autoDetectionEnabled ? "Ligado" : "Desligado"}
                </button>
              </div>

              <div className="settings-item">
                <div className="settings-item-label">
                  <i className="ti ti-device-floppy" />
                  <span>Auto-save</span>
                </div>
                <button className={`settings-toggle ${autoSaveEnabled ? "on" : ""}`} onClick={() => setAutoSaveEnabled(!autoSaveEnabled)} type="button">
                  {autoSaveEnabled ? "Ligado" : "Desligado"}
                </button>
              </div>
            </div>

            <button className="settings-action" onClick={toggleTheme} type="button">
              <i className="ti ti-palette" />
              <span>Tema atual: {theme === "dark" ? "Escuro" : "Claro"}</span>
            </button>

            <button className="settings-action" onClick={quickSave} type="button">
              <i className="ti ti-device-floppy" />
              <span>Salvar agora</span>
            </button>

            <button className="settings-action" onClick={() => setShowTimeSkipModal(true)} type="button">
              <i className="ti ti-clock-hour-4" />
              <span>Avançar no tempo</span>
            </button>

            <button className="settings-action" onClick={exportToBook} type="button">
              <i className="ti ti-book-download" />
              <span>Exportar aventura para livro</span>
            </button>

            <button className="settings-action" onClick={saveSlot} type="button">
              <i className="ti ti-bookmark-plus" />
              <span>Criar save slot</span>
            </button>

            <div className="card-box">
              <div className="section-label">Save slots</div>
              {saveList.length ? (
                <div className="equip-list">
                  {saveList.map((save) => (
                    <button
                      key={save.id}
                      className="settings-action"
                      onClick={() => loadSlot(save)}
                      type="button"
                    >
                      <i className="ti ti-bookmark" />
                      <span>
                        {save.name || "Save"}{save.timestamp ? ` · ${fmtTime(save.timestamp)}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="panel-sub">Nenhum save slot criado.</div>
              )}
            </div>

            <div className="card-box">
              <div className="section-label">Testes rápidos</div>
              <div className="dice-history">
                {attributeEntries.map(([key]) => (
                  <button
                    key={key}
                    className="dice-chip"
                    onClick={() => insertCmd(`[TESTE:${ATTR_LABELS[key] || key}] `)}
                    type="button"
                  >
                    {ATTR_LABELS[key] || key}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-box">
              <div className="section-label">Sessão</div>
              <div className="skill-list">
                <div className="skill-row">
                  <span className={`skill-dot ${connectionStatus === "online" ? "prof" : ""}`} />
                  <span className="skill-name">Conexão</span>
                  <span className="skill-val">{connectionStatus || "desconhecida"}</span>
                </div>
                <div className="skill-row">
                  <span className="skill-dot prof" />
                  <span className="skill-name">Último save</span>
                  <span className="skill-val">{lastSaved ? fmtTime(lastSaved) : "Ainda não salvo"}</span>
                </div>
              </div>
            </div>

            <button className="settings-action danger" onClick={resetChat} type="button">
              <i className="ti ti-trash" />
              <span>Resetar chat e progresso atual</span>
            </button>
          </div>
        </div>

        <nav className="mobile-nav">
          {navItems.map(({ id, badge }) => (
            <button
              key={id}
              className={`mobile-nav-item ${playPanel === id ? "active" : ""}`}
              onClick={() => setPlayPanel(id)}
              type="button"
              title={PANEL_META[id].label}
            >
              <i className={PANEL_META[id].icon} />
              <span>{PANEL_META[id].label}</span>
              {badge ? <span className="nav-badge">{badge}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      {showTimeSkipModal ? (
        <div className="modal-overlay" onClick={() => setShowTimeSkipModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Avançar no tempo</h3>
              <button className="modal-close" onClick={() => setShowTimeSkipModal(false)} type="button">
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="modal-body">
              <div className="time-config-section">
                <label>Quanto tempo deseja avançar?</label>
                <div className="time-input-group">
                  <input
                    className="time-input"
                    type="number"
                    min="1"
                    max="100"
                    value={timeSkipConfig?.amount || 1}
                    onChange={(event) =>
                      setTimeSkipConfig((prev) => ({ ...prev, amount: parseInt(event.target.value, 10) || 1 }))
                    }
                  />
                  <select
                    className="time-select"
                    value={timeSkipConfig?.unit || "dias"}
                    onChange={(event) => setTimeSkipConfig((prev) => ({ ...prev, unit: event.target.value }))}
                  >
                    <option value="dias">Dias</option>
                    <option value="semanas">Semanas</option>
                    <option value="meses">Meses</option>
                    <option value="anos">Anos</option>
                  </select>
                </div>
              </div>

              <div className="time-config-section">
                <label>Foco do personagem</label>
                <textarea
                  className="time-textarea"
                  rows={3}
                  value={timeSkipConfig?.focus || ""}
                  onChange={(event) => setTimeSkipConfig((prev) => ({ ...prev, focus: event.target.value }))}
                  placeholder="Ex: treinar combate, estudar magia, negociar alianças..."
                />
              </div>

              <div className="time-config-section">
                <div className="time-options">
                  <label className="time-checkbox">
                    <input
                      type="checkbox"
                      checked={!!timeSkipConfig?.includeEvents}
                      onChange={(event) => setTimeSkipConfig((prev) => ({ ...prev, includeEvents: event.target.checked }))}
                    />
                    <span>Incluir eventos importantes</span>
                  </label>
                  <label className="time-checkbox">
                    <input
                      type="checkbox"
                      checked={!!timeSkipConfig?.includeProgression}
                      onChange={(event) => setTimeSkipConfig((prev) => ({ ...prev, includeProgression: event.target.checked }))}
                    />
                    <span>Incluir progressão e XP</span>
                  </label>
                </div>
              </div>

              <div className="time-preview">
                <h4>Preview</h4>
                <p>
                  {c.charName || "Seu personagem"} vai passar <strong>{timeSkipConfig?.amount || 1} {timeSkipConfig?.unit || "dias"}</strong>
                  {timeSkipConfig?.focus ? ` focado em ${timeSkipConfig.focus}` : "."}
                </p>
                {timeSkipConfig?.includeProgression ? (
                  <p className="xp-preview">Ganho estimado: {estimatedXp} XP</p>
                ) : null}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowTimeSkipModal(false)} type="button">
                Cancelar
              </button>
              <button
                className="btn-confirm"
                onClick={executeTimeSkip}
                disabled={loading || !timeSkipConfig?.focus?.trim()}
                type="button"
              >
                {loading ? "Avançando..." : "Avançar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="toast-container">
        {(toasts || []).map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type || "info"}`}>
            <i className={TOAST_ICONS[toast.type] || TOAST_ICONS.info} />
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
