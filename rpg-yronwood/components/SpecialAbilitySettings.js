export default function SpecialAbilitySettings({ value = {}, onChange, disabled = false }) {
  const update = patch => onChange({ ...value, ...patch });
  return <fieldset className="special-ability-settings" disabled={disabled}>
    <legend>Habilidade especial de outro universo</legend>
    <label className="economy-setting"><input type="checkbox" checked={Boolean(value?.enabled)} onChange={e => update({ enabled: e.target.checked })} /><span><strong>Quero uma habilidade especial</strong><small>Vale também para personagens comuns. Somente seu personagem recebe essa exceção.</small></span></label>
    {value?.enabled ? <div className="ability-fields">
      <label>Nome da habilidade<input maxLength={100} value={value.name || ''} onChange={e => update({ name: e.target.value })} placeholder="Ex.: teletransporte, controlar sombras…" /></label>
      <label>Como funciona?<textarea rows={4} maxLength={2000} value={value.description || ''} onChange={e => update({ description: e.target.value })} placeholder="Descreva o que você consegue fazer, o alcance e como ativa o poder. Pode vir de outro universo ou ser inventado por você." /></label>
      <label>Limites ou custos — opcional<textarea rows={2} maxLength={1000} value={value.limits || ''} onChange={e => update({ limits: e.target.value })} placeholder="Ex.: só posso ir a lugares que consigo ver; preciso descansar entre usos." /></label>
      <label className="ability-secret"><input type="checkbox" checked={value.secret !== false} onChange={e => update({ secret: e.target.checked })} />O poder começa em segredo</label>
      <p className="settings-hint">Descreva o nome e o funcionamento para ativar. O Mestre seguirá essas regras na narrativa.</p>
    </div> : null}
  </fieldset>;
}
