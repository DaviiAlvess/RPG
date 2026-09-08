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
Narre este intervalo a partir dessa intenção, respeitando recursos, habilidades, local e relações já estabelecidos. Intenção não é resultado garantido.
Mostre a passagem do tempo com 2 ou 3 momentos concretos conectados, em vez de listar dias ou repetir a rotina. Dê um detalhe de progresso e uma consequência coerente quando houver; não force tragédia, combate ou reviravolta.
Treino e trabalho exigem esforço e condições; não conceda poderes, dinheiro, itens ou níveis sem fundamento nas regras. Descanso não resolve automaticamente doenças ou ferimentos graves.
Não invente falas, sentimentos, decisões ou relacionamentos do jogador. Se surgir uma decisão importante, apresente-a ao fim do intervalo como uma oportunidade ainda em aberto, sem resolvê-la por ele.
Respeite o estilo e tamanho de narração escolhidos. Apresente uma cena concreta para retomar o jogo e encerre com o título **Balanço do período**. Nesse balanço, use quatro tópicos curtos: **O que fez**, **Conquistas e progresso**, **Mudanças e consequências**, **Pendências**. Relacione cada atividade solicitada ao que realmente aconteceu, inclusive tentativas incompletas. Diferencie intenção, progresso parcial e conquista confirmada; se nada foi conquistado, diga isso. Não invente recompensas para preencher o balanço. Ele faz parte da história e os próximos turnos devem respeitar esses resultados. No modo curto, reduza as cenas para reservar espaço ao balanço.
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
