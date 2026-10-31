import { useMemo, useState } from "react";
import Head from "next/head";
import { PRESET_TONES, filterPresets } from "../lib/adventure-presets.mjs";
import { listActiveSpecialAbilities } from "../lib/special-ability.mjs";

function PresetCard({ preset, onPick, actions = null, badge = "" }) {
  const powers = listActiveSpecialAbilities(preset.specialAbility);
  return (
    <article className="preset-card preset-card-compact">
      <span className="preset-world">
        {preset.world}
        {preset.tone ? <span className="preset-tone">{preset.tone}</span> : null}
        {badge ? <span className="preset-tone preset-tone-badge">{badge}</span> : null}
      </span>
      <h3>{preset.charName}</h3>
      <p>{preset.hook || String(preset.storyStartPoint || "").slice(0, 160)}</p>
      <span className="preset-role">{preset.charTitle}{preset.genre ? ` · ${preset.genre}` : ""}</span>
      {powers.length ? <span className="preset-role">Poder: {powers.map((a) => a.name).join(" · ")}</span> : null}
      {preset.author ? <span className="preset-role">Por {preset.author}</span> : null}
      <button type="button" className="btn-primary" onClick={() => onPick(preset)}>Revisar ficha</button>
      {actions ? <div className="preset-actions">{actions}</div> : null}
    </article>
  );
}

/** Biblioteca de histórias prontas, das histórias do jogador e da recebida por link. */
export default function PresetLibrary({
  presets, edric, onPickEdric, onPick, onBack,
  userTemplates = [], sharedTemplate = null, onSaveShared, onDismissShared, onDeleteTemplate, onShareTemplate,
}) {
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState("");
  const [origin, setOrigin] = useState("todos");
  const filtered = useMemo(() => filterPresets(presets, { query, tone, origin }), [presets, query, tone, origin]);
  const filtering = Boolean(query.trim() || tone || origin !== "todos");

  return (
    <div className="rpg-shell">
      <Head><title>RPGs prontos — Forja de Mundos</title></Head>
      <div className="cr-head">
        <button className="btn-ghost" type="button" onClick={onBack}>← Voltar</button>
        <span className="shell-eyebrow">RPGS PRONTOS</span>
      </div>
      <main className="cr-body">
        {sharedTemplate ? (
          <section className="preset-library preset-shared" aria-labelledby="shared-title">
            <h2 id="shared-title">História recebida por link</h2>
            <p className="settings-hint">Alguém compartilhou esta aventura com você. Jogue agora ou guarde nas suas histórias.</p>
            <div className="preset-grid">
              <PresetCard
                preset={sharedTemplate}
                onPick={onPick}
                badge="Compartilhada"
                actions={<>
                  <button type="button" className="btn-ghost" onClick={() => onSaveShared(sharedTemplate)}><i className="ti ti-bookmark" /> Guardar</button>
                  <button type="button" className="btn-ghost" onClick={onDismissShared}>Dispensar</button>
                </>}
              />
            </div>
          </section>
        ) : null}

        {userTemplates.length ? (
          <section className="preset-library" aria-labelledby="mine-title">
            <h2 id="mine-title">Minhas histórias</h2>
            <p className="settings-hint">Aventuras que você salvou como modelo. Copie o link para um amigo jogar a mesma história.</p>
            <div className="preset-grid">
              {userTemplates.map((t) => (
                <PresetCard
                  key={t.id}
                  preset={t}
                  onPick={onPick}
                  badge="Sua"
                  actions={<>
                    <button type="button" className="btn-ghost" onClick={() => onShareTemplate(t)}><i className="ti ti-link" /> Copiar link</button>
                    <button type="button" className="btn-ghost" onClick={() => onDeleteTemplate(t)}><i className="ti ti-trash" /> Apagar</button>
                  </>}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="preset-library" aria-labelledby="preset-title">
          <h2 id="preset-title">Histórias prontas</h2>
          <p className="settings-hint">Cada carta é um ponto de partida com segredos que o Mestre conhece e você vai descobrir. Você revisa a ficha antes da primeira cena.</p>

          <div className="preset-filters">
            <input
              className="field-input preset-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por mundo, nome ou tema…"
              aria-label="Buscar histórias"
            />
            <div className="chips" role="group" aria-label="Tom da história">
              <button type="button" className={`chip ${!tone ? "on" : ""}`} aria-pressed={!tone} onClick={() => setTone("")}>Todos os tons</button>
              {PRESET_TONES.map((t) => (
                <button key={t} type="button" className={`chip ${tone === t ? "on" : ""}`} aria-pressed={tone === t} onClick={() => setTone(tone === t ? "" : t)}>{t}</button>
              ))}
            </div>
            <div className="chips" role="group" aria-label="Tipo de mundo">
              {[["todos", "Todos os mundos"], ["conhecido", "Mundos conhecidos"], ["original", "Mundos originais"]].map(([id, label]) => (
                <button key={id} type="button" className={`chip ${origin === id ? "on" : ""}`} aria-pressed={origin === id} onClick={() => setOrigin(id)}>{label}</button>
              ))}
            </div>
            <p className="preset-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "história" : "histórias"}</p>
          </div>

          <div className="preset-grid">
            {!filtering && edric ? (
              <article className="preset-card preset-card-featured">
                <div className="preset-card-copy">
                  <span className="preset-world">Westeros · Clássico</span>
                  <h3>Edric Yronwood</h3>
                  <p className="preset-role">Lorde de Pedra Sangrenta · 26 anos</p>
                  <p>A casa ainda cheira a cal e sangue velho. Um emissário de Porto Real espera no pátio com uma lista de cabeças dornesas.</p>
                </div>
                <button type="button" className="btn-primary" onClick={onPickEdric}>Jogar como Edric</button>
              </article>
            ) : null}
            {filtered.map((preset) => <PresetCard key={preset.id} preset={preset} onPick={onPick} />)}
          </div>
          {!filtered.length ? (
            <div className="preset-empty">
              <p>Nenhuma história com esses filtros.</p>
              <button type="button" className="btn-ghost" onClick={() => { setQuery(""); setTone(""); setOrigin("todos"); }}>Limpar filtros</button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
