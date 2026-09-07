import { NARRATION_STYLES, NARRATION_LENGTHS, NARRATION_PACES, normalizeNarration } from '../lib/narration.mjs';
export default function NarrationSettings({ value, onChange, disabled = false }) {
  const current = normalizeNarration(value);
  const update = change => onChange({ ...current, ...change });
  return <section className="narration-settings" aria-label="Personalizar narração">
    <div className="section-label">A voz da sua aventura</div><p className="settings-hint">O mesmo mundo pode ser contado de vários jeitos. Escolha o seu.</p>
    <div className="narration-grid">{Object.entries(NARRATION_STYLES).map(([id, style]) => <button key={id} type="button" disabled={disabled} aria-pressed={current.style === id} className={'narration-choice ' + (current.style === id ? 'selected' : '')} onClick={() => update({ style: id })}><span aria-hidden="true">{style.icon}</span><strong>{style.label}</strong><small>{style.description}</small></button>)}</div>
    <blockquote className="narration-sample"><span>Uma mesma cena, neste estilo</span><p>{NARRATION_STYLES[current.style].sample}</p></blockquote>
    <div className="narration-controls"><label>Tamanho da resposta<select disabled={disabled} value={current.length} onChange={e => update({ length: e.target.value })}>{Object.entries(NARRATION_LENGTHS).map(([id, option]) => <option key={id} value={id}>{option.label}</option>)}</select></label><label>Ritmo<select disabled={disabled} value={current.pace} onChange={e => update({ pace: e.target.value })}>{Object.entries(NARRATION_PACES).map(([id, option]) => <option key={id} value={id}>{option.label}</option>)}</select></label></div>
    <p className="settings-hint">As mudanças valem para as próximas respostas. O exemplo é ilustrativo; a IA pode variar o resultado.</p>
  </section>;
}
