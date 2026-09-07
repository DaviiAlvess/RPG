import { buildNarrationDirection } from './narration.mjs';
import { buildCharacterNamingDirection } from './character-names.mjs';

export function memoryCutoff(messages, memoryUntil = 0, economy = false) {
  const start = Math.max(0, Math.min(Number(memoryUntil) || 0, messages.length));
  const pending = messages.slice(start);
  const characters = pending.reduce((total, message) => total + String(message.content || '').length, 0);
  const shouldSummarize = economy
    ? pending.length > 13 && characters > 16000
    : pending.length > 24;
  if (!shouldSummarize) return start;
  let cutoff = messages.length - (economy ? 9 : 13);
  // Keep the next request starting with a user turn, including old histories.
  while (cutoff > start && messages[cutoff]?.role !== 'user') cutoff--;
  return Math.max(start, cutoff);
}

export function economyPrompt(c, lore, calendar) {
  return [
    `Mestre de RPG em ${c.world}. Narre em português, segunda pessoa. Estilo de jogo: ${c.gameStyle || 'aventura'}.`,
    `PERSONAGEM: ${JSON.stringify({ name: c.charName, title: c.charTitle, age: c.charAge, background: c.charBg, personality: c.charPersonality, abilities: c.charSkills, appearance: c.charAppearanceNote || c.appearance })}`,
    `MUNDO: ${lore || c.worldBg || ''}\nCONTEXTO DO PERSONAGEM: ${c.charLore || ''}`,
    `INÍCIO: ${c.storyStartPoint || ''}\nELENCO: ${c.supportingCast || ''}`,
    `MEMÓRIA: ${c.memory || ''}\nDATA: ${calendar}`,
    `ESTADO: ${JSON.stringify({ hp: c.hp, level: c.level, attributes: c.attributes, items: c.items, missions: c.missions, relationships: c.relationships, worldState: c.worldState, temporalEffects: c.temporalEffects })}`,
    'Respeite o universo e a época. Contextos gerados por IA não são fontes verificadas. Não invente fatos canônicos. Personagens originais não substituem protagonistas.',
    c.ordinaryCharacter ? 'O jogador é uma pessoa comum: sem profecia, linhagem secreta ou poderes especiais não estabelecidos.' : 'Habilidades excepcionais só existem quando definidas na ficha; NPCs não as conhecem sem evidência.',
    'Nunca fale, escolha ou sinta pelo jogador. Use seu nome só quando necessário. Diálogos em linhas Nome: "fala". Não liste opções obrigatórias.',
    'Ação incerta: [TESTE:Força|DC:12] ou Destreza, Mente, Carisma. DC 8 fácil, 12 normal, 16 difícil, 20 extremo. Interrompa e aguarde o dado. Respeite o resultado calculado pelo jogo.',
    'Registre somente fatos novos confirmados: [ITEM:nome recebido], [MISSÃO:objetivo], [CONCLUÍDA:objetivo], [LOCAL:nome], [NPC:nome|função, local e fatos], [PROMESSA:descrição], [SEGREDO:fato e quem sabe]. Atualize NPCs existentes sem recriá-los. Não revele segredos sem evidência.',
    'Passagem real de tempo: [TIME_SKIP: unidade=horas, quantidade=2]. Unidades: minutos, horas, dias, semanas, meses, anos. Não avance novamente se o jogador já avançou o calendário.',
    c.useImages ? 'Ao final, IMAGE_PROMPT: cenário em inglês, sem texto.' : 'Não gere IMAGE_PROMPT.',
    buildNarrationDirection({ ...c.narration, length: 'short' }),
    buildCharacterNamingDirection(c)
  ].join('\n');
}
