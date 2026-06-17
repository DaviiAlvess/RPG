import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "pages", "index.js");
const lines = fs.readFileSync(file, "utf8").split("\n");
const start = lines.findIndex((l) => l.includes("// ═══ PLAY ═══"));
const end = lines.findIndex((l) => l.includes("// ─── Sub-components"));
if (start < 0 || end < 0) {
  console.error("Markers not found", { start, end });
  process.exit(1);
}

const block = `  // ═══ PLAY ══════════════════════════════════════════════════════════
  return (
    <PlayView
      active={active}
      disp={disp}
      loading={loading}
      statusText={statusText}
      sceneImg={sceneImg}
      imgOk={imgOk}
      setImgOk={setImgOk}
      hp={hp}
      level={level}
      experience={experience}
      attributes={attributes}
      skills={skills}
      missions={missions}
      characterAge={characterAge}
      input={input}
      setInput={setInput}
      autoMode={autoMode}
      autoWaiting={autoWaiting}
      countdown={countdown}
      showRollButton={showRollButton}
      lastRoll={lastRoll}
      playPanel={playPanel}
      setPlayPanel={setPlayPanel}
      diceHistory={diceHistory}
      diceNum={diceNum}
      diceLabel={diceLabel}
      invInput={invInput}
      setInvInput={setInvInput}
      theme={theme}
      soundEnabled={soundEnabled}
      setSoundEnabled={setSoundEnabled}
      autoDetectionEnabled={autoDetectionEnabled}
      setAutoDetectionEnabled={setAutoDetectionEnabled}
      autoSaveEnabled={autoSaveEnabled}
      setAutoSaveEnabled={setAutoSaveEnabled}
      connectionStatus={connectionStatus}
      lastSaved={lastSaved}
      showTimeSkipModal={showTimeSkipModal}
      setShowTimeSkipModal={setShowTimeSkipModal}
      timeSkipConfig={timeSkipConfig}
      setTimeSkipConfig={setTimeSkipConfig}
      toasts={toasts}
      bottomRef={bottomRef}
      taRef={taRef}
      GAME_STYLES={GAME_STYLES}
      activeMissions={activeMissions}
      doneMissions={doneMissions}
      clearAuto={clearAuto}
      setView={setView}
      toggleAuto={toggleAuto}
      quickSave={quickSave}
      handleSend={handleSend}
      rollD20={rollD20}
      rollDiceSides={rollDiceSides}
      rollDiceMultiple={rollDiceMultiple}
      changeHp={changeHp}
      handleLevelUp={handleLevelUp}
      addItem={addItem}
      removeItem={removeItem}
      useItem={useItem}
      toggleTheme={toggleTheme}
      executeTimeSkip={executeTimeSkip}
      exportToBook={exportToBook}
      saveSlot={saveSlot}
      loadSlot={loadSlot}
      resetChat={resetChat}
      insertCmd={insertCmd}
      intervene={intervene}
    />
  );
`;

const out = [...lines.slice(0, start), ...block.split("\n"), ...lines.slice(end)];
fs.writeFileSync(file, out.join("\n"), "utf8");
console.log("Wired PlayView into index.js");
