export const MAX_SPECIAL_ABILITIES = 3;
export const ABILITY_NAME_MAX = 200;
export const ABILITY_DESCRIPTION_MAX = 6000;
export const ABILITY_LIMITS_MAX = 3000;

export function normalizeOneSpecialAbility(entry = {}) {
  // Sem trim aqui: o formulário normaliza a cada tecla e trim impedia digitar espaços.
  return {
    name: String(entry?.name || '').slice(0, ABILITY_NAME_MAX),
    description: String(entry?.description || '').slice(0, ABILITY_DESCRIPTION_MAX),
    limits: String(entry?.limits || '').slice(0, ABILITY_LIMITS_MAX),
    secret: entry?.secret !== false,
  };
}

function isCompleteAbility(ability) {
  return Boolean(String(ability?.name || '').trim() && String(ability?.description || '').trim());
}

/** Limpa bordas só ao persistir / enviar ao mestre — não usar no onChange do formulário. */
export function finalizeSpecialAbilities(value = {}) {
  const bundle = normalizeSpecialAbilities(value);
  return decorateLegacyFields({
    enabled: bundle.enabled === true,
    abilities: bundle.abilities.map((ability) => ({
      name: String(ability.name || '').trim().slice(0, ABILITY_NAME_MAX),
      description: String(ability.description || '').trim().slice(0, ABILITY_DESCRIPTION_MAX),
      limits: String(ability.limits || '').trim().slice(0, ABILITY_LIMITS_MAX),
      secret: ability.secret !== false,
    })),
  });
}

/** Aceita o formato antigo (um objeto) ou até 3 habilidades em `abilities`. */
export function normalizeSpecialAbilities(value = {}) {
  if (Array.isArray(value)) {
    const abilities = value.map(normalizeOneSpecialAbility).slice(0, MAX_SPECIAL_ABILITIES);
    const complete = abilities.filter(isCompleteAbility);
    return decorateLegacyFields({
      enabled: complete.length > 0,
      abilities,
    });
  }

  if (value && Array.isArray(value.abilities)) {
    const abilities = value.abilities.map(normalizeOneSpecialAbility).slice(0, MAX_SPECIAL_ABILITIES);
    return decorateLegacyFields({
      enabled: value.enabled === true,
      abilities,
    });
  }

  const one = normalizeOneSpecialAbility(value);
  const abilities = one.name || one.description ? [one] : [];
  return decorateLegacyFields({
    enabled: value?.enabled === true,
    abilities,
  });
}

function decorateLegacyFields(bundle) {
  const first = bundle.abilities.find(isCompleteAbility) || bundle.abilities[0] || normalizeOneSpecialAbility();
  return {
    enabled: bundle.enabled === true,
    abilities: bundle.abilities,
    name: first.name,
    description: first.description,
    limits: first.limits,
    secret: first.secret,
  };
}

/** Compatível com saves antigos — limpa bordas para persistir / abrir campanha. */
export function normalizeSpecialAbility(value = {}) {
  return finalizeSpecialAbilities(value);
}

export function listActiveSpecialAbilities(value) {
  const bundle = finalizeSpecialAbilities(value);
  if (!bundle.enabled) return [];
  return bundle.abilities.filter(isCompleteAbility).slice(0, MAX_SPECIAL_ABILITIES);
}

export function specialAbilitiesAreValid(value) {
  const bundle = normalizeSpecialAbilities(value);
  if (!bundle.enabled) return true;
  return listActiveSpecialAbilities(bundle).length > 0;
}

/** Coloca ou troca a habilidade escolhida no texto do bate-papo. */
export function prepareAbilityInput(previous, abilityName) {
  const name = String(abilityName || '').trim();
  if (!name) return String(previous || '');
  const raw = String(previous || '');
  const trimmed = raw.trim();
  const rest = trimmed.replace(/^Uso\s+.+\s+para\s*/i, '').trim();
  const prefix = `Uso ${name} para `;
  if (!rest) return prefix;
  return `${prefix}${rest}`;
}

export function specialAbilityDirection(value) {
  const active = listActiveSpecialAbilities(value);
  if (!active.length) return '';
  const many = active.length > 1;
  return [
    many
      ? `EXCEÇÃO EXPLÍCITA ESCOLHIDA PELO JOGADOR — até ${active.length} habilidades especiais. Prevalecem sobre a restrição de personagem comum e a proibição de poderes de outros universos SOMENTE para estas habilidades:`
      : 'EXCEÇÃO EXPLÍCITA ESCOLHIDA PELO JOGADOR — prevalece sobre a restrição de personagem comum e a proibição de poderes de outros universos SOMENTE para esta habilidade:',
    JSON.stringify(active),
    many
      ? 'O personagem possui estas habilidades desde o início da campanha e pode tentar usá-las. Não negue a existência por não pertencerem ao universo. Mantenha o restante do mundo fiel às suas regras.'
      : 'O personagem possui esta habilidade desde o início da campanha e pode tentar usá-la. Não negue sua existência por não pertencer ao universo. Mantenha o restante do mundo fiel às suas regras.',
    'Aplique os efeitos descritos, sem acrescentar técnicas, linhagens ou poderes não escolhidos. Um uso direto e garantido pela descrição não exige teste artificial; use testes apenas quando a execução ou resistência for realmente incerta.',
    'Respeite exatamente os custos, limites e condições informados em cada habilidade. Se uma não tiver limites explícitos, não invente um custo fixo arbitrário.',
    active.some((ability) => ability.secret)
      ? 'Habilidades marcadas como segredo começam ocultas. NPCs só conhecem o que testemunharam ou descobriram por evidência; conserve descobertas já registradas e nunca apague o conhecimento de testemunhas.'
      : 'Não imponha segredo ao jogador. NPCs ainda precisam de uma fonte plausível para conhecer o poder.',
    'Não distribua estas habilidades a NPCs ou inimigos para compensar o jogador. Não use o poder nem decida revelá-lo sem uma ação do jogador.',
  ].join('\n');
}
