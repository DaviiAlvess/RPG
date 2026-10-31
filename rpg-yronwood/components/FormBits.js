// Campos simples usados no assistente de criação.
export function F({ label, value, set, placeholder, ta, rows }) {
  const id = "field-" + String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      {ta
        ? <textarea id={id} className="field-input" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} rows={rows || 4} />
        : <input id={id} className="field-input" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />}
    </div>
  );
}

export function Toggle({ title, desc, value, onChange }) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <div className="toggle-title">{title}</div>
        <div className="toggle-desc">{desc}</div>
      </div>
      <button type="button" className={`toggle-btn ${value ? "on" : ""}`} onClick={onChange} aria-pressed={value}>
        {value ? "Sim" : "Não"}
      </button>
    </div>
  );
}
