export const MASTER_AGREEMENTS_MAX = 2200;
export const MASTER_AGREEMENT_ITEM_MAX = 400;

const agreementKey = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

export function parseAcordoTags(text) {
  const found = [];
  for (const match of String(text || '').matchAll(/\[ACORDO:\s*([^\]]+)\]/gi)) {
    const value = match[1].trim().slice(0, MASTER_AGREEMENT_ITEM_MAX);
    if (value) found.push(value);
  }
  return found;
}

export function stripAcordoTags(text) {
  return String(text || '')
    .replace(/(?:^|\n)[ \t]*\[ACORDO:\s*[^\]]+\][ \t]*(?=\n|$)/gi, '')
    .replace(/[ \t]*\[ACORDO:\s*[^\]]+\][ \t]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitGuidance(note) {
  return String(note || '')
    .split(/\n+/)
    .map(line => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
}

export function listMasterAgreements(campaign = {}) {
  if (Array.isArray(campaign.masterAgreements)) {
    const fromList = campaign.masterAgreements.map(item => String(item || '').trim()).filter(Boolean);
    if (fromList.length || !String(campaign.masterGuidance || '').trim()) return fromList;
  }
  return splitGuidance(campaign.masterGuidance);
}

export function capMasterAgreements(items, maxTotal = MASTER_AGREEMENTS_MAX) {
  const unique = [];
  const seen = new Set();
  for (const raw of items) {
    let text = String(raw || '').trim();
    if (!text) continue;
    if (text.length > maxTotal) text = text.slice(0, maxTotal);
    const key = agreementKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(text);
  }
  let total = unique.reduce((sum, text, index) => sum + text.length + (index ? 1 : 0), 0);
  while (unique.length && total > maxTotal) {
    const removed = unique.shift();
    total -= removed.length + (unique.length ? 1 : 0);
  }
  return unique;
}

export function mergeMasterAgreements(campaign, incoming = []) {
  const before = listMasterAgreements(campaign);
  const list = capMasterAgreements([...before, ...incoming]);
  const beforeKeys = new Set(before.map(agreementKey));
  const added = list.filter(item => !beforeKeys.has(agreementKey(item)));
  return { list, added };
}

export function appendMasterAgreements(campaign, incoming = []) {
  return mergeMasterAgreements(campaign, incoming).list;
}

export function applyMasterAgreements(agreements) {
  const list = capMasterAgreements(agreements);
  return { masterAgreements: list, masterGuidance: list.join('\n') };
}

export function masterGuidance(campaign) {
  const items = capMasterAgreements(listMasterAgreements(campaign));
  if (!items.length) return '';
  return [
    'ACORDOS DA MESA — respeite os acordos da mesa em cada turno de narração.',
    'São preferências de condução e tom; não são acontecimento, recompensa nem alteração automática da ficha. Preserve as decisões do jogador e os resultados confirmados.',
    items.map(item => `- ${item}`).join('\n'),
  ].join('\n');
}

export function masterChatPrompt(campaign) {
  return [
    'Você é o Mestre deste RPG conversando diretamente com o jogador FORA da história. Responda em português, de forma clara, breve e acolhedora. Ajude a entender regras, a cena atual e possibilidades; escute pedidos sobre a condução do jogo.',
    'Não narre novas ações, não avance tempo, não role dados, não conceda recompensas e não emita comandos ou marcadores do jogo — exceto a tag oculta [ACORDO:] abaixo. Não revele segredos desconhecidos do personagem. Se faltar informação, diga isso. Não afirme ter alterado a ficha, o inventário ou a história já narrada.',
    'Se o jogador pedir uma regra ou preferência DURADOURA da mesa (tom, ritmo, temas, o que evitar, estilo de cena) e você concordar, confirme em uma frase e, na última linha, emita exatamente: [ACORDO: texto curto da regra]. Só use a tag para um combinado novo e claro. Não use para perguntas, regras pontuais da cena atual ou pedidos que você recusar. Não mostre a tag como parte da conversa falada.',
    `Campanha: ${campaign.world}. Personagem: ${campaign.charName}.`,
    `Ficha atual: ${JSON.stringify({ hp: campaign.hp, level: campaign.level, attributes: campaign.attributes, items: campaign.items, specialAbility: campaign.specialAbility })}`,
    `Cena recente: ${String([...(campaign.disp || [])].reverse().find(message => message.type === 'gm')?.text || '').slice(-6000)}`,
    masterGuidance(campaign),
  ].filter(Boolean).join('\n');
}
