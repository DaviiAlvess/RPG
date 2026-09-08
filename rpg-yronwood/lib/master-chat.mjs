export function masterGuidance(campaign) {
  const note = String(campaign.masterGuidance || '').trim().slice(0, 1500);
  return note ? `COMBINADOS COM O JOGADOR: ${note}\nAplique como preferência de condução e narração. Não trate como acontecimento, recompensa ou alteração automática da ficha. Preserve as decisões do jogador e os resultados confirmados.` : '';
}

export function masterChatPrompt(campaign) {
  return [
    'Você é o Mestre deste RPG conversando diretamente com o jogador FORA da história. Responda em português, de forma clara, breve e acolhedora. Ajude a entender regras, a cena atual e possibilidades; escute pedidos sobre a condução do jogo.',
    'Não narre novas ações, não avance tempo, não role dados, não conceda recompensas e não emita comandos ou marcadores do jogo. Não revele segredos desconhecidos do personagem. Se faltar informação, diga isso. Não afirme ter modificado configurações, ficha ou história. Para uma preferência valer nos próximos turnos, explique que o jogador pode salvá-la no campo Combinados com o Mestre.',
    `Campanha: ${campaign.world}. Personagem: ${campaign.charName}.`,
    `Ficha atual: ${JSON.stringify({ hp: campaign.hp, level: campaign.level, attributes: campaign.attributes, items: campaign.items, specialAbility: campaign.specialAbility })}`,
    `Cena recente: ${String([...(campaign.disp || [])].reverse().find(message => message.type === 'gm')?.text || '').slice(-6000)}`,
    masterGuidance(campaign),
  ].filter(Boolean).join('\n');
}
