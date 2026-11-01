import { useEffect, useRef, useState } from "react";
import { createNarrator, readVoicePrefs, VOICE_PREF_KEY } from "../lib/voice-narration.mjs";

let narrator = null;
const getNarrator = () => {
  if (typeof window === "undefined") return null;
  if (!narrator) narrator = createNarrator();
  return narrator;
};
const loadPrefs = () => (typeof window === "undefined" ? readVoicePrefs(null) : readVoicePrefs(window.localStorage));
const lastGm = (disp) => {
  for (let i = (disp || []).length - 1; i >= 0; i--) if (disp[i]?.type === "gm") return disp[i].text || "";
  return "";
};

function useSpeaking() {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    const n = getNarrator();
    return n ? n.onChange(setSpeaking) : undefined;
  }, []);
  return speaking;
}

/** Botão pequeno para ouvir uma resposta específica. */
export function ListenButton({ text }) {
  const n = getNarrator();
  if (!n?.supported) return null;
  return (
    <button type="button" className="listen-btn" onClick={() => n.speak(text, loadPrefs())} title="Ouvir esta parte" aria-label="Ouvir esta parte da narração">
      <i className="ti ti-volume" aria-hidden="true" />
    </button>
  );
}

/** Controle de narração por voz: leitura automática, voz e velocidade. */
export default function VoiceControl({ disp }) {
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [voices, setVoices] = useState([]);
  const speaking = useSpeaking();
  const seen = useRef(null);

  useEffect(() => {
    const n = getNarrator();
    setSupported(Boolean(n?.supported));
    if (!n?.supported) return undefined;
    const refresh = () => setVoices(n.voices());
    refresh();
    window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
    return () => { window.speechSynthesis.removeEventListener?.("voiceschanged", refresh); n.stop(); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(VOICE_PREF_KEY, JSON.stringify(prefs)); } catch {}
  }, [prefs]);

  // Lê automaticamente só respostas NOVAS (não relê o save ao abrir).
  useEffect(() => {
    const len = (disp || []).length;
    if (seen.current === null) { seen.current = len; return; }
    if (len > seen.current) {
      const last = disp[len - 1];
      const gmJustArrived = disp.slice(seen.current).some((m) => m?.type === "gm");
      if (prefs.auto && gmJustArrived) getNarrator()?.speak(last?.type === "gm" ? last.text : lastGm(disp), prefs);
    }
    seen.current = len;
  }, [disp, prefs]);

  if (!supported) return null;
  const set = (patch) => setPrefs((p) => ({ ...p, ...patch }));
  const ptVoices = voices.filter((v) => /^pt/i.test(v.lang));
  const list = ptVoices.length ? ptVoices : voices;

  return (
    <div className="voice-control">
      <button type="button" className={`ambience-btn ${prefs.auto || speaking ? "on" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} title="Narração por voz">
        <i className={`ti ${speaking ? "ti-player-stop" : "ti-microphone-2"}`} aria-hidden="true" />
        <span className="ambience-label">{speaking ? "Narrando" : "Voz"}</span>
      </button>
      {open ? (
        <div className="voice-pop" role="dialog" aria-label="Narração por voz">
          <label className="voice-row">
            <input type="checkbox" checked={prefs.auto} onChange={(e) => set({ auto: e.target.checked })} />
            <span>Ler cada resposta do Mestre em voz alta</span>
          </label>
          {list.length ? (
            <label className="voice-field">
              <span>Voz</span>
              <select className="field-input" value={prefs.voiceURI} onChange={(e) => set({ voiceURI: e.target.value })}>
                <option value="">Automática (português)</option>
                {list.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
              </select>
            </label>
          ) : <p className="settings-hint">Este navegador não tem vozes em português instaladas; será usada a voz padrão.</p>}
          <label className="voice-field">
            <span>Velocidade: {prefs.rate.toFixed(1)}×</span>
            <input type="range" min="0.6" max="1.6" step="0.1" value={prefs.rate} onChange={(e) => set({ rate: Number(e.target.value) })} />
          </label>
          <div className="voice-actions">
            {speaking
              ? <button type="button" className="btn-ghost" onClick={() => getNarrator()?.stop()}><i className="ti ti-player-stop" /> Parar</button>
              : <button type="button" className="btn-ghost" onClick={() => getNarrator()?.speak(lastGm(disp), prefs)} disabled={!lastGm(disp)}><i className="ti ti-player-play" /> Ouvir a última cena</button>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
