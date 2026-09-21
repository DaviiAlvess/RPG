import { specialAbilityDirection } from "./special-ability.mjs";
import { masterGuidance, masterInterventionContext } from './master-chat.mjs';
import { buildNarrationDirection } from './narration.mjs';
import { buildCharacterNamingDirection } from './character-names.mjs';
import { knownIpFidelityRule } from './canon.mjs';
import { identityPromptLines, identityTagList } from './identity.mjs';

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
    `PERSONAGEM: ${JSON.stringify({ name: c.charName, title: c.charTitle, originTitle: c.charOriginTitle || '', situation: c.charSituation || '', age: c.charAge, background: c.charBg, personality: c.charPersonality, abilities: c.charSkills, appearance: c.charAppearanceNote || c.appearance })}`,
    `MUNDO: ${worldBlock}\nCONTEXTO DO PERSONAGEM: ${c.charLore || ''}`,
    `PREMISSA INICIAL (começo, não o status atual): ${c.storyStartPoint || ''}\nELENCO: ${c.supportingCast || ''}`,
    identityPromptLines(c).join('\n'),
    `MEMÓRIA: ${c.memory || ''}\nDATA: ${calendar}`,
    `ESTADO: ${JSON.stringify({ hp: c.hp, level: c.level, experience: c.experience ?? 0, attributes: c.attributes, skills: c.skills || {}, items: c.items, missions: c.missions, relationships: c.relationships, worldState: c.worldState, temporalEffects: c.temporalEffects })}`,
    c.pendingLevelNote ? `CONTEXTO INTERNO: ${c.pendingLevelNote}` : "",
    masterInterventionContext(c.pendingMasterNote, { short: true }),
    'Respeite o universo e a época. Contextos gerados por IA não são fontes verificadas. Não invente fatos canônicos. Personagens originais não substituem protagonistas. Pedido em Falar com o Mestre sobre atração ou relação na cena atual é fato da mesa: mostre agora; não recuse por canon.',
    c.ordinaryCharacter ? 'O jogador iniciou como pessoa comum: sem profecia, linhagem secreta ou poderes especiais não estabelecidos. Cargo e função acompanham a campanha; a origem continua no prompt. Sem intimidade gratuita com protagonistas — EXCETO INTERVENÇÃO DO MESTRE ou acordo da mesa pedindo atração/relação: nesse caso obedeça o Mestre.' : 'Habilidades excepcionais só existem quando definidas na ficha; NPCs não as conhecem sem evidência.',
    'Nunca fale, escolha ou sinta pelo jogador. Use seu nome só quando necessário. Diálogos em linhas Nome: "fala". Não liste opções obrigatórias.',
    'A câmera é o jogador ("você"): magnética, atrás/dentro dos olhos. Vale em toda campanha, inclusive save antigo. Primeiro sujeito gramatical = campo sensorial (mão, ombro, visão). NPCs a partir de você (À sua frente…, canto do olho); proibido "o subordinado" / "o transeunte" / figura encapuzada como protagonista. Feche o turno.',
    'Mesmo curto: comece na ação do jogador, um detalhe sensorial revelador, NPC com intenção; nunca fale ou sinta pelo jogador.',
    'Ação incerta: [TESTE:Força|DC:12] ou Destreza, Mente, Carisma. DC 8 fácil, 12 normal, 16 difícil, 20 extremo. Interrompa e aguarde o total que o jogo enviar. Narre 1 = falha crítica, 20 = sucesso crítico, senão sucesso / parcial / falha. Não invente faixas 1-5/16-20.',
    `Registre somente fatos novos confirmados: [ITEM:nome recebido], [MISSÃO:objetivo], [CONCLUÍDA:objetivo], [XP:n], [HP:+n] ou [HP:-n], [LOCAL:nome], [NPC:nome|função, local e fatos], [PROMESSA:descrição], [SEGREDO:fato e quem sabe], [RELAÇÃO:Nome|Atitude], ${identityTagList()}. Atualize NPCs existentes sem recriá-los. Não revele segredos sem evidência.`,
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
