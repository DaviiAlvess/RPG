export const TIME_SKIP_FOCUSES = ['Livre', 'Treinar', 'Trabalhar', 'Investigar', 'Descansar', 'Criar laços', 'Viajar'];
export function normalizeSkipIntent(config = {}) {
  const unit = ['minutos', 'horas', 'dias', 'semanas', 'meses', 'anos'].includes(config.unit) ? config.unit : 'dias';
  const max = { minutos: 1440, horas: 24, dias: 365, semanas: 52, meses: 120, anos: 100 }[unit];
  return {
    unit, amount: Math.min(max, Math.max(1, Math.floor(Number(config.amount) || 1))),
    focus: TIME_SKIP_FOCUSES.includes(config.focus) ? config.focus : 'Livre',
    intention: String(config.intention || '').trim().slice(0, 2000)
  };
}
export function buildSkipMessage(config, interval, cancelledTest = null) {
  const intent = normalizeSkipIntent(config);
  return `[O jogador avançou o tempo: ${interval}.
Foco escolhido: ${intent.focus}.
${cancelledTest ? `Antes do intervalo, o jogador desistiu da tentativa pendente de ${cancelledTest.attribute}: ${cancelledTest.description || 'ação proposta'}. Não houve rolagem nem sucesso confirmado. Registre a desistência no balanço; não repita esse teste nem conceda sua recompensa. Preserve riscos e consequências já estabelecidos, narrando uma transição coerente para o período solicitado.` : ''}
O que pretende fazer: ${intent.intention || 'Seguir a rotina atual, sem assumir compromissos novos.'}
Este intervalo é desenvolvimento, não recapitulativo. Intenção não é resultado garantido.
Narre da visão do jogador, em segunda pessoa ("você"): o que chega aos olhos, ouvidos e mãos. Escreva 2 a 4 cenas ligadas, um arco curto — não um diário, não uma lista de dias, não um relatório de status.
O texto principal é a história:
- Esforço: o que você tentou, com o foco e as condições reais (local, recursos, relações).
- Mudança: o que se deslocou — perícia, relação, fadiga, rumor, dívida, reputação, ferida ou oportunidade — visível na cena, não em tópicos.
- Complicação ou custo: um obstáculo coerente (atraso, testemunha, cansaço, dívida, rumor, recusa). Não force tragédia, combate ou reviravolta; não invente sucesso para completar o arco.
- Agora: caia numa cena concreta no presente, com alguém ou algo à frente, para o jogador agir. Se surgir decisão importante, deixe-a em aberto.
Respeite o foco e a intenção escrita. Treino e trabalho exigem esforço e condições; não conceda poderes, dinheiro, itens ou níveis sem fundamento nas regras. Descanso não cura automaticamente doenças ou ferimentos graves. Não invente falas, sentimentos, decisões ou relacionamentos do jogador.
Só depois, como posfácio curto — não o miolo da resposta — encerre com o título **Balanço do período**. Use quatro tópicos breves: **O que fez**, **Conquistas e progresso**, **Mudanças e consequências**, **Pendências**. Relacione cada atividade ao que realmente aconteceu, inclusive tentativas incompletas. Diferencie intenção, progresso parcial e conquista confirmada; se nada foi conquistado, diga isso. Não invente recompensas para preencher o balanço. Os próximos turnos devem respeitar esses resultados. No modo curto, enxugue as cenas, mas não substitua o desenvolvimento pelo balanço.
O calendário deste intervalo será confirmado pelo jogo após sua resposta. Não inclua TIME_SKIP nem avance tempo adicional.]`;
}

export function createSkipEvent(plan, narrative, gameTime) {
  const intent = normalizeSkipIntent(plan.intent);
  const result = String(narrative || '').trim();
  const heading = /(?:^|\n)[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?Balanço do período(?:\*\*)?[ \t]*:?/i.exec(result);
  return {
    id: plan.id, type: 'time_skip', label: plan.separator.text,
    totalDaysElapsed: gameTime.totalDaysElapsed,
    startGameTime: plan.startGameTime, endGameTime: gameTime,
    intent, narrative: result,
    balance: heading ? result.slice(heading.index).trim() : '',
  };
}
