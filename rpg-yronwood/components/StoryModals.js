import { useEffect, useRef, useState } from "react";
import { endingSummary, tensionLabel, clampTension } from "../lib/story-progress.mjs";
import { createAmbience, moodForCampaign, AMBIENCE_MOODS } from "../lib/ambience.js";
import { PortraitImage } from "./AppearanceCreator";

function Modal({ title, onClose, children, footer, className = "" }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content story-modal ${className}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Fechar"><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

/** "Anteriormente..." ao abrir um save. */
export function RecapModal({ recap, campaign, onClose, onNarrate }) {
  if (!recap) return null;
  const c = campaign || {};
  return (
    <Modal
      title="Anteriormente…"
      onClose={onClose}
      className="recap-modal"
      footer={<>
        {!recap.narrated ? (
          <button type="button" className="btn-ghost" onClick={onNarrate} disabled={recap.loading}>
            <i className="ti ti-sparkles" /> {recap.loading ? "O Mestre está lembrando…" : "Narrar com o Mestre"}
          </button>
        ) : null}
        <button type="button" className="btn-primary recap-continue" onClick={onClose}>Continuar</button>
      </>}
    >
      <div className="recap-head">
        {c.portraitUrl ? <PortraitImage src={c.portraitUrl} alt="" size={56} /> : null}
        <div>
          <div className="recap-name">{c.charName}</div>
          <div className="recap-world">{c.world}{recap.away >= 1 ? ` · ${recap.away === 1 ? "1 dia" : `${recap.away} dias`} desde a última sessão` : ""}</div>
        </div>
      </div>
      {recap.narrated ? <p className="recap-narrated">{recap.narrated}</p> : null}
      {recap.error ? <p className="field-needed">{recap.error}</p> : null}
      {!recap.narrated ? <p className="recap-scene">{recap.lastScene}</p> : null}
      <dl className="recap-facts">
        {recap.location ? <><dt>Onde você está</dt><dd>{recap.location}</dd></> : null}
        {recap.plots.length ? <><dt>O que está em jogo</dt><dd>{recap.plots.map((p) => <span key={p}>{p}</span>)}</dd></> : null}
        {recap.promises.length ? <><dt>Promessas em aberto</dt><dd>{recap.promises.map((p) => <span key={p}>{p}</span>)}</dd></> : null}
        {recap.lastClue ? <><dt>Última pista ({recap.clueCount})</dt><dd>{recap.lastClue}</dd></> : null}
        {recap.tension ? <><dt>Clima</dt><dd>{recap.tension}</dd></> : null}
      </dl>
      {recap.away >= 2 ? <p className="settings-hint">O mundo não ficou parado enquanto você esteve fora.</p> : null}
    </Modal>
  );
}

/** Tela de final de história. */
export function EndingScreen({ campaign, onClose, onSaveAsTemplate, onExport, onExit }) {
  const s = endingSummary(campaign);
  return (
    <Modal
      title="Fim da história"
      onClose={onClose}
      className="ending-modal"
      footer={<>
        <button type="button" className="btn-ghost" onClick={onExport}><i className="ti ti-book-download" /> Exportar livro</button>
        {onSaveAsTemplate ? <button type="button" className="btn-ghost" onClick={onSaveAsTemplate}><i className="ti ti-share" /> Salvar como história</button> : null}
        <button type="button" className="btn-ghost" onClick={onExit}>Voltar ao início</button>
        <button type="button" className="btn-primary ending-continue" onClick={onClose}>Continuar no epílogo</button>
      </>}
    >
      <div className="ending-hero">
        {campaign?.portraitUrl ? <PortraitImage src={campaign.portraitUrl} alt="" size={96} /> : null}
        <div>
          <div className="ending-eyebrow">{campaign?.charName} ganhou o título</div>
          <h2 className="ending-title">{s.title}</h2>
          {s.epilogue ? <p className="ending-epilogue">{s.epilogue}</p> : null}
        </div>
      </div>
      <div className="ending-stats">
        <span><strong>{s.days}</strong> dias de história</span>
        <span><strong>{s.level}</strong> nível</span>
        <span><strong>{s.clues}</strong> pistas</span>
        <span><strong>{s.missionsDone.length}</strong> missões</span>
      </div>
      {s.choices.length ? (
        <section><div className="section-label">Escolhas que marcaram</div><ul className="ending-list">{s.choices.map((c) => <li key={c}>{c}</li>)}</ul></section>
      ) : null}
      {s.plots.length ? (
        <section><div className="section-label">Tramas</div><ul className="ending-list">{s.plots.map((p) => <li key={p.title}><i className={`ti ${p.status === "encerrada" ? "ti-check" : "ti-hourglass"}`} /> {p.title}{p.status !== "encerrada" ? " (em aberto)" : ""}</li>)}</ul></section>
      ) : null}
      {(s.allies.length || s.enemies.length || s.neutral.length) ? (
        <section className="ending-people">
          {s.allies.length ? <div><div className="section-label">Ao seu lado</div><p>{s.allies.join(", ")}</p></div> : null}
          {s.enemies.length ? <div><div className="section-label">Contra você</div><p>{s.enemies.join(", ")}</p></div> : null}
          {s.neutral.length ? <div><div className="section-label">Em dúvida</div><p>{s.neutral.join(", ")}</p></div> : null}
        </section>
      ) : null}
    </Modal>
  );
}

/** Indicador vago do relógio da história. */
export function TensionMeter({ value }) {
  const v = clampTension(value);
  return (
    <div className={`tension-meter t${v}`} title="Clima da história — sobe quando o tempo corre contra você" aria-label={`Clima: ${tensionLabel(v)}`}>
      <span className="tension-dots" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className={i < v ? "on" : ""} />)}</span>
      <span className="tension-label">{tensionLabel(v)}</span>
    </div>
  );
}

const AMBIENCE_PREF = "rpg-ambience";

/** Botão de música ambiente (liga/desliga e volume). Só toca depois de um toque do jogador. */
export function AmbienceControl({ campaign, tension }) {
  const engine = useRef(null);
  const [on, setOn] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [open, setOpen] = useState(false);
  const mood = moodForCampaign(campaign);

  useEffect(() => {
    try {
      const pref = JSON.parse(localStorage.getItem(AMBIENCE_PREF) || "{}");
      if (typeof pref.volume === "number") setVolume(pref.volume);
    } catch {}
    return () => { engine.current?.stop(); };
  }, []);
  useEffect(() => { engine.current?.setMood(mood); }, [mood]);
  useEffect(() => { engine.current?.setTension(tension); }, [tension]);
  useEffect(() => {
    engine.current?.setVolume(volume);
    try { localStorage.setItem(AMBIENCE_PREF, JSON.stringify({ volume })); } catch {}
  }, [volume]);

  const toggle = async () => {
    if (on) { await engine.current?.stop(); engine.current = null; setOn(false); return; }
    engine.current = createAmbience();
    engine.current.setVolume(volume);
    engine.current.setTension(tension);
    const ok = await engine.current.start(mood);
    setOn(ok);
  };

  return (
    <div className="ambience-control">
      <button type="button" className={`ambience-btn ${on ? "on" : ""}`} onClick={toggle} aria-pressed={on} title={on ? "Desligar música ambiente" : `Ligar música ambiente (${AMBIENCE_MOODS[mood].label})`}>
        <i className={`ti ${on ? "ti-music" : "ti-music-off"}`} aria-hidden="true" />
        <span className="ambience-label">{on ? AMBIENCE_MOODS[mood].label : "Música"}</span>
      </button>
      {on ? (
        <button type="button" className="ambience-vol-btn" onClick={() => setOpen((o) => !o)} aria-label="Volume da música" aria-expanded={open}>
          <i className="ti ti-volume" />
        </button>
      ) : null}
      {on && open ? (
        <input className="ambience-volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" />
      ) : null}
    </div>
  );
}
