import { useEffect, useState } from "react";
import {
  APP_OPTIONS,
  APP_LABELS,
  APP_GROUPS,
  DEFAULT_APP,
  PORTRAIT_STYLES,
  portraitUrl,
  portraitIsCurrent,
  randomSeed,
} from "../lib/appearance.mjs";

/**
 * Retrato do personagem. Mostra estado de carregamento e erro, porque o
 * gerador de imagem pode levar alguns segundos.
 */
export function PortraitImage({ src, alt, size = 160, className = "" }) {
  const [state, setState] = useState(src ? "loading" : "empty");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { setState(src ? "loading" : "empty"); setAttempt(0); }, [src]);
  const shown = src && attempt ? `${src}&r=${attempt}` : src;
  return (
    <div className={`portrait-frame ${className} is-${state}`} style={{ width: size, height: size }}>
      {src ? (
        <img
          key={shown}
          src={shown}
          alt={alt}
          width={size}
          height={size}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
        />
      ) : null}
      {state === "empty" ? <i className="ti ti-user portrait-placeholder" aria-hidden="true" /> : null}
      {state === "loading" ? <div className="portrait-status"><span className="portrait-spinner" />Pintando…</div> : null}
      {state === "error" ? (
        <button type="button" className="portrait-status portrait-retry" onClick={() => { setState("loading"); setAttempt((n) => n + 1); }}>
          <i className="ti ti-refresh" /> Tentar de novo
        </button>
      ) : null}
    </div>
  );
}

/**
 * Criador de aparência: chips por grupo, roupa, detalhes livres e retrato.
 * `value` é o formulário/campanha; `onChange(patch)` recebe só os campos alterados.
 */
export default function AppearanceCreator({ value, onChange, disabled = false }) {
  const c = value || {};
  const appearance = { ...DEFAULT_APP, ...(c.appearance || {}) };
  const [group, setGroup] = useState(APP_GROUPS[0].id);
  const current = portraitIsCurrent(c);
  const outdated = Boolean(c.portraitUrl) && !current;

  const setTrait = (key, opt) => onChange({ appearance: { ...appearance, [key]: opt }, appearanceCustomized: true });
  const generate = (newFace = false) => {
    const seed = newFace || !c.portraitSeed ? randomSeed() : c.portraitSeed;
    onChange({ portraitSeed: seed, portraitUrl: portraitUrl({ ...c, appearance }, seed) });
  };
  const activeGroup = APP_GROUPS.find((g) => g.id === group) || APP_GROUPS[0];

  return (
    <div className="appearance-creator">
      <div className="ac-portrait-col">
        <PortraitImage src={c.portraitUrl} alt={`Retrato de ${c.charName || "seu personagem"}`} size={168} />
        {outdated ? <p className="ac-outdated">Você mudou a aparência. Atualize o retrato para ver.</p> : null}
        <div className="ac-portrait-actions">
          <button type="button" className="btn-ghost ac-btn-main" disabled={disabled || current} onClick={() => generate(false)}>
            <i className="ti ti-brush" /> {c.portraitUrl ? (outdated ? "Atualizar retrato" : "Retrato em dia") : "Gerar retrato"}
          </button>
          {c.portraitUrl ? (
            <button type="button" className="btn-ghost" disabled={disabled} onClick={() => generate(true)} title="Mesma aparência, outro rosto">
              <i className="ti ti-dice-5" /> Outro rosto
            </button>
          ) : null}
        </div>
        <div className="chips ac-style" role="group" aria-label="Estilo do retrato">
          {Object.entries(PORTRAIT_STYLES).map(([id, s]) => {
            const on = (c.portraitStyle || "painted") === id;
            return (
              <button key={id} type="button" className={`chip ${on ? "on" : ""}`} aria-pressed={on} disabled={disabled} onClick={() => onChange({ portraitStyle: id })}>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ac-traits">
        <div className="ac-tabs" role="tablist" aria-label="Partes da aparência">
          {APP_GROUPS.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={g.id === group} className={`ac-tab ${g.id === group ? "on" : ""}`} onClick={() => setGroup(g.id)}>
              {g.label}
            </button>
          ))}
          <button type="button" role="tab" aria-selected={group === "estilo"} className={`ac-tab ${group === "estilo" ? "on" : ""}`} onClick={() => setGroup("estilo")}>
            Roupa e detalhes
          </button>
        </div>

        {group === "estilo" ? (
          <div className="ac-free">
            <label className="field">
              <div className="field-label">Roupa e estilo</div>
              <input className="field-input" value={c.charOutfit || ""} maxLength={300} disabled={disabled} placeholder="ex: gibão de couro escuro, capa de areia, broche da casa" onChange={(e) => onChange({ charOutfit: e.target.value })} />
            </label>
            <label className="field">
              <div className="field-label">Detalhes marcantes</div>
              <textarea className="field-input" rows={3} value={c.charAppearanceNote || ""} maxLength={600} disabled={disabled} placeholder="ex: cicatriz do queixo à orelha, anel de ferro no polegar, voz rouca" onChange={(e) => onChange({ charAppearanceNote: e.target.value })} />
            </label>
            <p className="settings-hint">O Mestre usa isso nas descrições. Os detalhes também entram no retrato.</p>
          </div>
        ) : (
          activeGroup.keys.map((key) => (
            <div key={key} className="app-section">
              <div className="app-section-label" id={`app-${key}`}>{APP_LABELS[key]}</div>
              <div className="chips" role="group" aria-labelledby={`app-${key}`}>
                {APP_OPTIONS[key].map((opt) => (
                  <button key={opt} type="button" className={`chip ${appearance[key] === opt ? "on" : ""}`} aria-pressed={appearance[key] === opt} disabled={disabled} onClick={() => setTrait(key, opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
