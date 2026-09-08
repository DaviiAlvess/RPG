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
export function buildSkipMessage(config, interval) {
  const intent = normalizeSkipIntent(config);
  return `[O jogador avançou o tempo: ${interval}.
Foco escolhido: ${intent.focus}.
O que pretende fazer: ${intent.intention || 'Seguir a rotina atual, sem assumir compromissos novos.'}
Narre este intervalo a partir dessa intenção, respeitando recursos, habilidades, local e relações já estabelecidos. Intenção não é resultado garantido.
Mostre a passagem do tempo com 2 ou 3 momentos concretos conectados, em vez de listar dias ou repetir a rotina. Dê um detalhe de progresso e uma consequência coerente quando houver; não force tragédia, combate ou reviravolta.
Treino e trabalho exigem esforço e condições; não conceda poderes, dinheiro, itens ou níveis sem fundamento nas regras. Descanso não resolve automaticamente doenças ou ferimentos graves.
Não invente falas, sentimentos, decisões ou relacionamentos do jogador. Se surgir uma decisão importante, apresente-a ao fim do intervalo como uma oportunidade ainda em aberto, sem resolvê-la por ele.
Respeite o estilo e tamanho de narração escolhidos. Termine com uma cena concreta para retomar o jogo.
O calendário deste intervalo será confirmado pelo jogo após sua resposta. Não inclua TIME_SKIP nem avance tempo adicional.]`;
}
