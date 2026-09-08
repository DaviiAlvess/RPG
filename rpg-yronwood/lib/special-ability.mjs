export function normalizeSpecialAbility(value = {}) {
  return {
    enabled: value?.enabled === true,
    name: String(value?.name || '').trim().slice(0, 100),
    description: String(value?.description || '').trim().slice(0, 2000),
    limits: String(value?.limits || '').trim().slice(0, 1000),
    secret: value?.secret !== false
  };
}
export function specialAbilityDirection(value) {
  const ability = normalizeSpecialAbility(value);
  if (!ability.enabled || !ability.name || !ability.description) return '';
  return [
    'EXCEÇÃO EXPLÍCITA ESCOLHIDA PELO JOGADOR — prevalece sobre a restrição de personagem comum e a proibição de poderes de outros universos SOMENTE para esta habilidade:',
    JSON.stringify(ability),
    'O personagem possui esta habilidade desde o início da campanha e pode tentar usá-la. Não negue sua existência por não pertencer ao universo. Mantenha o restante do mundo fiel às suas regras.',
    'Aplique os efeitos descritos, sem acrescentar técnicas, linhagens ou poderes não escolhidos. Um uso direto e garantido pela descrição não exige teste artificial; use testes apenas quando a execução ou resistência for realmente incerta.',
    ability.limits ? 'Respeite exatamente os custos, limites e condições informados.' : 'Não invente um custo fixo ou uma proibição arbitrária; esclareça ambiguidades quando forem relevantes para a ação.',
    ability.secret ? 'O poder começa em segredo. NPCs só conhecem o que testemunharam ou descobriram por evidência; conserve descobertas já registradas e nunca apague o conhecimento de testemunhas.' : 'Não imponha segredo ao jogador. NPCs ainda precisam de uma fonte plausível para conhecer o poder.',
    'Não distribua esta habilidade a NPCs ou inimigos para compensar o jogador. Não use o poder nem decida revelá-lo sem uma ação do jogador.'
  ].join('\n');
}
