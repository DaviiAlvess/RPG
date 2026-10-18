import {
  ABILITY_DESCRIPTION_MAX,
  ABILITY_LIMITS_MAX,
  ABILITY_NAME_MAX,
  MAX_SPECIAL_ABILITIES,
  normalizeSpecialAbilities,
} from "../lib/special-ability.mjs";

const emptyAbility = () => ({ name: "", description: "", limits: "", secret: true });

export default function SpecialAbilitySettings({ value = {}, onChange, disabled = false }) {
  const bundle = normalizeSpecialAbilities(value);
  const abilities = bundle.abilities.length ? bundle.abilities : [emptyAbility()];

  const emit = (next) => onChange(normalizeSpecialAbilities(next));

  const updateEnabled = (enabled) => {
    const nextAbilities = enabled
      ? (abilities.length ? abilities : [emptyAbility()])
      : abilities;
    emit({ enabled, abilities: nextAbilities });
  };

  const updateAbility = (index, patch) => {
    const next = abilities.map((ability, i) => (i === index ? { ...ability, ...patch } : ability));
    emit({ enabled: true, abilities: next });
  };

  const addAbility = () => {
    if (abilities.length >= MAX_SPECIAL_ABILITIES) return;
    emit({ enabled: true, abilities: [...abilities, emptyAbility()] });
  };

  const removeAbility = (index) => {
    if (abilities.length <= 1) {
      emit({ enabled: true, abilities: [emptyAbility()] });
      return;
    }
    emit({ enabled: true, abilities: abilities.filter((_, i) => i !== index) });
  };

  return (
    <fieldset className="special-ability-settings" disabled={disabled}>
      <legend>Habilidades especiais (até {MAX_SPECIAL_ABILITIES})</legend>
      <label className="economy-setting">
        <input
          type="checkbox"
          checked={Boolean(bundle.enabled)}
          onChange={(event) => updateEnabled(event.target.checked)}
        />
        <span>
          <strong>Quero habilidades especiais</strong>
          <small>Até {MAX_SPECIAL_ABILITIES} poderes. Vale também para personagens comuns — só o seu personagem recebe a exceção.</small>
        </span>
      </label>

      {bundle.enabled ? (
        <div className="ability-fields">
          {abilities.map((ability, index) => (
            <div className="ability-slot" key={`ability-${index}`}>
              <div className="ability-slot-head">
                <strong>Habilidade {index + 1}</strong>
                {abilities.length > 1 ? (
                  <button type="button" className="btn-ghost" onClick={() => removeAbility(index)}>
                    Remover
                  </button>
                ) : null}
              </div>
              <label>
                Nome da habilidade
                <input
                  maxLength={ABILITY_NAME_MAX}
                  value={ability.name || ""}
                  onChange={(event) => updateAbility(index, { name: event.target.value })}
                  placeholder="Ex.: teletransporte, controlar sombras…"
                />
                <small className="settings-hint">{(ability.name || "").length}/{ABILITY_NAME_MAX}</small>
              </label>
              <label>
                Como funciona?
                <textarea
                  rows={7}
                  maxLength={ABILITY_DESCRIPTION_MAX}
                  value={ability.description || ""}
                  onChange={(event) => updateAbility(index, { description: event.target.value })}
                  placeholder="Descreva o que faz, alcance, como ativa, o que acontece se falhar. Pode vir de outro universo ou ser inventado."
                />
                <small className="settings-hint">{(ability.description || "").length}/{ABILITY_DESCRIPTION_MAX}</small>
              </label>
              <label>
                Limites ou custos — opcional
                <textarea
                  rows={4}
                  maxLength={ABILITY_LIMITS_MAX}
                  value={ability.limits || ""}
                  onChange={(event) => updateAbility(index, { limits: event.target.value })}
                  placeholder="Ex.: só lugares que consigo ver; descanso entre usos; custo de sangue, cansaço, ruído…"
                />
                <small className="settings-hint">{(ability.limits || "").length}/{ABILITY_LIMITS_MAX}</small>
              </label>
              <label className="ability-secret">
                <input
                  type="checkbox"
                  checked={ability.secret !== false}
                  onChange={(event) => updateAbility(index, { secret: event.target.checked })}
                />
                Esta habilidade começa em segredo
              </label>
            </div>
          ))}

          {abilities.length < MAX_SPECIAL_ABILITIES ? (
            <button type="button" className="settings-action" onClick={addAbility}>
              Adicionar outra habilidade ({abilities.length}/{MAX_SPECIAL_ABILITIES})
            </button>
          ) : (
            <p className="settings-hint">Máximo de {MAX_SPECIAL_ABILITIES} habilidades especiais.</p>
          )}
          <p className="settings-hint">
            Preencha nome e funcionamento de pelo menos uma. O Mestre segue essas regras na narrativa.
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}
