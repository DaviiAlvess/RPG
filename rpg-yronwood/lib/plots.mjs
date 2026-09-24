const plotId = () => `p${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function asPlotList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((plot) => {
    if (typeof plot === 'string') {
      const title = plot.trim();
      return title ? { id: plotId(), title, hook: '', status: 'ativa' } : null;
    }
    const title = String(plot?.title || '').trim();
    if (!title) return null;
    return {
      id: plot?.id || plotId(),
      title: title.slice(0, 80),
      hook: String(plot.hook || '').trim().slice(0, 220),
      status: plot.status === 'encerrada' ? 'encerrada' : 'ativa',
    };
  }).filter(Boolean);
}

function sameTitle(a, b) {
  const left = String(a || '').toLowerCase();
  const right = String(b || '').toLowerCase();
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

export function parsePlotTags(text, current = []) {
  let updated = asPlotList(current);
  for (const match of String(text || '').matchAll(/\[TRAMA:([^\]]+)\]/gi)) {
    const raw = match[1].trim();
    const [titlePart, ...hookParts] = raw.split('|');
    const title = String(titlePart || '').trim().slice(0, 80);
    const hook = hookParts.join('|').trim().slice(0, 220);
    if (!title) continue;
    const existing = updated.find((plot) => sameTitle(plot.title, title));
    if (existing) {
      updated = updated.map((plot) => (plot === existing && hook ? { ...plot, hook } : plot));
      continue;
    }
    updated = [...updated, { id: plotId(), title, hook, status: 'ativa' }];
  }
  for (const match of String(text || '').matchAll(/\[TRAMA_FIM:([^\]]+)\]/gi)) {
    const title = match[1].trim();
    if (!title) continue;
    updated = updated.map((plot) => (sameTitle(plot.title, title) ? { ...plot, status: 'encerrada' } : plot));
  }
  return updated;
}

export function plotPromptLines(plots = []) {
  const list = asPlotList(plots);
  if (!list.length) return 'TRAMAS DESTA HISTÓRIA: (nenhuma ainda — abra uma na primeira cena).';
  return [
    'TRAMAS DESTA HISTÓRIA (só desta campanha):',
    ...list.map((plot) => `- ${plot.title}${plot.hook ? ` — ${plot.hook}` : ''} [${plot.status}]`),
  ].join('\n');
}

export function plotDirection(camp = {}) {
  const world = String(camp.world || '').trim() || 'este mundo';
  if (camp.isKnownIP) {
    return [
      `TRAMAS — UNIVERSO EXISTENTE (${world}).`,
      `A busca na rede deve listar conflitos e arcos estabelecidos (guerra, sucessão, facção, mistério em curso).`,
      `Encaixe o jogador na margem de UMA trama — extra local, pedido, rumor, escolta, dívida — sem substituir o roteiro oficial nem o destino dos protagonistas.`,
      `Se a lista estiver vazia e a busca estiver ligada, pesquise arcos atuais de "${world}" antes de inventar.`,
      `Nova trama: [TRAMA:título|gancho em 1 linha]. Encerrar: [TRAMA_FIM:título]. Objetivo concreto da trama também vira [MISSÃO:...].`,
    ].join(' ');
  }
  return [
    `TRAMAS — MUNDO ORIGINAL (${world}).`,
    `Invente 1 ou 2 fios a partir dos conflitos do próprio mundo (facção, dívida, desaparecimento, fronteira).`,
    `Se a lista estiver vazia, abra uma trama na primeira cena com [TRAMA:título|gancho]. Encerrar: [TRAMA_FIM:título]. Objetivo concreto também vira [MISSÃO:...].`,
  ].join(' ');
}
