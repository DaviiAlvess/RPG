import { specialAbilityDirection } from "./special-ability.mjs";
import { masterGuidance } from './master-chat.mjs';
import { buildNarrationDirection } from './narration.mjs';
import { buildCharacterNamingDirection } from './character-names.mjs';
import { knownIpFidelityRule } from './canon.mjs';

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
  const worldBlock = [lore, c.worldBg].map(value => String(value || '').trim()).filter(Boolean).join('\n');
  return [
    `Mestre de RPG em ${c.world}. Narre em português, segunda pessoa. Estilo de jogo: ${c.gameStyle || 'aventura'}.`,
    c.isKnownIP ? knownIpFidelityRule(c.world) : '',
    `PERSONAGEM: ${JSON.stringify({ name: c.charName, title: c.charTitle, age: c.charAge, background: c.charBg, personality: c.charPersonality, abilities: c.charSkills, appearance: c.charAppearanceNote || c.appearance })}`,
    `MUNDO: ${worldBlock}\nCONTEXTO DO PERSONAGEM: ${c.charLore || ''}`,
    `INÍCIO: ${c.storyStartPoint || ''}\nELENCO: ${c.supportingCast || ''}`,
    `MEMÓRIA: ${c.memory || ''}\nDATA: ${calendar}`,
    `ESTADO: ${JSON.stringify({ hp: c.hp, level: c.level, experience: c.experience ?? 0, attributes: c.attributes, skills: c.skills || {}, items: c.items, missions: c.missions, relationships: c.relationships, worldState: c.worldState, temporalEffects: c.temporalEffects })}`,
    c.pendingLevelNote ? `CONTEXTO INTERNO: ${c.pendingLevelNote}` : "",
    'Respeite o universo e a época. Contextos gerados por IA não são fontes verificadas. Não invente fatos canônicos. Personagens originais não substituem protagonistas.',
    c.ordinaryCharacter ? 'O jogador é uma pessoa comum: sem profecia, linhagem secreta ou poderes especiais não estabelecidos.' : 'Habilidades excepcionais só existem quando definidas na ficha; NPCs não as conhecem sem evidência.',
    'Nunca fale, escolha ou sinta pelo jogador. Use seu nome só quando necessário. Diálogos em linhas Nome: "fala". Não liste opções obrigatórias.',
    'A câmera é o jogador ("você"): primeiro sujeito = seu corpo (mão, carroça, pacote). NPCs a partir de você; proibido "o transeunte" / figura encapuzada como protagonista. Feche o turno.',
    'Mesmo curto: comece na ação do jogador, um detalhe sensorial revelador, NPC com intenção; nunca fale ou sinta pelo jogador.',
    'Ação incerta: [TESTE:Força|DC:12] ou Destreza, Mente, Carisma. DC 8 fácil, 12 normal, 16 difícil, 20 extremo. Interrompa e aguarde o total que o jogo enviar. Narre 1 = falha crítica, 20 = sucesso crítico, senão sucesso / parcial / falha. Não invente faixas 1-5/16-20.',
    'Registre somente fatos novos confirmados: [ITEM:nome recebido], [MISSÃO:objetivo], [CONCLUÍDA:objetivo], [XP:n], [HP:+n] ou [HP:-n], [LOCAL:nome], [NPC:nome|função, local e fatos], [PROMESSA:descrição], [SEGREDO:fato e quem sabe], [RELAÇÃO:Nome|Atitude]. Atualize NPCs existentes sem recriá-los. Não revele segredos sem evidência.',
    'Se a atitude de um NPC mudar, emita [RELAÇÃO:Nome|Atitude] (Hostil, Suspeito, Neutral, Amigável) só na mudança — não a cada turno. Nunca escreva a tag no diálogo.',
    'Conceda XP só por vitória confirmada, missão concluída ou risco inteligente — 5–25 em geral, nunca por andar ou conversar. Não mencione XP na narração.',
    'Ferimento ou cura clara na cena: tag oculta [HP:-8] ou [HP:+12] (somente com sinal). Não a cada turno. A 0 HP, narre desmaio/inconsciência — o jogador não morre automaticamente a menos que o mundo o mate; aguarde o jogador ou o Mestre.',
    'Passagem real de tempo: [TIME_SKIP: unidade=horas, quantidade=2]. Unidades: minutos, horas, dias, semanas, meses, anos. Não avance novamente se o jogador já avançou o calendário.',
    c.useImages ? 'Ao final, IMAGE_PROMPT: cenário em inglês, sem texto.' : 'Não gere IMAGE_PROMPT.',
    buildNarrationDirection({ ...c.narration, length: 'short' }),
    masterGuidance(c),
    buildCharacterNamingDirection(c),
    specialAbilityDirection(c.specialAbility)
  ].filter(Boolean).join('\n');
}
