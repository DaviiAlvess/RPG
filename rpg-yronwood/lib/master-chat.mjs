import { parseIdentityTags, stripIdentityTags } from './identity.mjs';
import { parseRelationships } from './relationships.mjs';

export const MASTER_AGREEMENTS_MAX = 2200;
export const MASTER_AGREEMENT_ITEM_MAX = 400;
export const MASTER_INTERVENTION_MAX = 400;

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

export function parseIntervencaoTags(text) {
  const found = [];
  for (const match of String(text || '').matchAll(/\[INTERVEN[CÇ][AÃ]O:\s*([^\]]+)\]/gi)) {
    const value = match[1].trim().slice(0, MASTER_INTERVENTION_MAX);
    if (value) found.push(value);
  }
  return found;
}

const MASTER_TAG_LINE = /(?:^|\n)[ \t]*\[(?:ACORDO|CARGO|SITUA[CÇ][AÃ]O|SITUACAO|HABILIDADE|RELA[CÇ][AÃ]O|RELACAO|INTERVEN[CÇ][AÃ]O):[^\]]*\][ \t]*(?=\n|$)/gi;
const MASTER_TAG_INLINE = /[ \t]*\[(?:ACORDO|CARGO|SITUA[CÇ][AÃ]O|SITUACAO|HABILIDADE|RELA[CÇ][AÃ]O|RELACAO|INTERVEN[CÇ][AÃ]O):[^\]]*\][ \t]*/gi;

export function stripAcordoTags(text) {
  return String(text || '')
    .replace(/(?:^|\n)[ \t]*\[ACORDO:\s*[^\]]+\][ \t]*(?=\n|$)/gi, '')
    .replace(/[ \t]*\[ACORDO:\s*[^\]]+\][ \t]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function stripMasterTags(text) {
  return stripIdentityTags(String(text || ''))
    .replace(MASTER_TAG_LINE, '')
    .replace(MASTER_TAG_INLINE, '')
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

function sameText(a, b) {
  return String(a || '').trim() === String(b || '').trim();
}

function identityChanged(campaign, identity) {
  return !sameText(campaign.charTitle, identity.charTitle)
    || !sameText(campaign.charSituation, identity.charSituation)
    || !sameText(campaign.charSkills, identity.charSkills);
}

function relationshipsChanged(before, after) {
  const prev = before && typeof before === 'object' ? before : {};
  const next = after && typeof after === 'object' ? after : {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (prev[key] !== next[key]) return true;
  }
  return false;
}

export function describeMasterChatChanges(changes = {}) {
  return [
    changes.acordo && 'Acordo salvo',
    changes.cargo && 'Cargo atualizado',
    changes.relacao && 'Relação atualizada',
    changes.intervencao && 'Intervenção na próxima cena',
  ].filter(Boolean).join('. ');
}

export function masterInterventionContext(note, { short = false } = {}) {
  const text = String(note || '').trim();
  if (!text) return '';
  const head = short ? 'CONTEXTO INTERNO' : 'CONTEXTO INTERNO (não é fala do jogador)';
  return `${head}: INTERVENÇÃO DO MESTRE — aplique AGORA nesta narração (atração de NPC, cargo, retcon ou correção da cena): ${text}`;
}

/** Aplica tags da conversa com o Mestre ao estado da campanha, sem narrar. */
export function applyMasterChatReply(campaign = {}, gmText = '') {
  const extracted = parseAcordoTags(gmText);
  const merged = extracted.length
    ? mergeMasterAgreements(campaign, extracted)
    : { list: listMasterAgreements(campaign), added: [] };
  const identity = parseIdentityTags(gmText, campaign);
  const relationships = parseRelationships(gmText, campaign.relationships || {});
  const incoming = parseIntervencaoTags(gmText).join(' ').trim().slice(0, MASTER_INTERVENTION_MAX);
  const previousNote = String(campaign.pendingMasterNote || '').trim();
  const pendingMasterNote = [previousNote, incoming].filter(Boolean).join(' ').slice(0, MASTER_INTERVENTION_MAX);
  const changes = {
    acordo: merged.added.length > 0,
    cargo: identityChanged(campaign, identity),
    relacao: relationshipsChanged(campaign.relationships, relationships),
    intervencao: Boolean(incoming),
  };
  let memory = String(campaign.memory || '');
  if (incoming) {
    const line = `Intervenção do Mestre: ${incoming}`;
    if (!memory.includes(incoming)) memory = memory ? `${memory.trim()}\n${line}` : line;
  }
  return {
    visible: stripMasterTags(gmText) || String(gmText || '').trim(),
    patch: {
      ...applyMasterAgreements(merged.list),
      ...identity,
      relationships,
      pendingMasterNote,
      memory,
    },
    added: merged.added,
    changes,
    status: describeMasterChatChanges(changes),
  };
}

function identityPromptBlock(campaign = {}) {
  const relationships = Object.entries(campaign.relationships || {})
    .map(([npc, attitude]) => `- ${npc}: ${attitude}`)
    .join('\n') || '- (nenhum definido ainda)';
  return [
    `Identidade atual: cargo="${String(campaign.charTitle || '').trim() || '(nenhum)'}", origem="${String(campaign.charOriginTitle || '').trim() || '(igual ao cargo)'}", situação="${String(campaign.charSituation || '').trim() || '(nenhuma)'}", talentos="${String(campaign.charSkills || '').trim() || '(nenhum)'}".`,
    `Relações atuais (atitude do NPC com o jogador):\n${relationships}`,
  ].join('\n');
}

export function masterChatPrompt(campaign) {
  return [
    'Você é o Mestre deste RPG conversando diretamente com o jogador FORA da história. Responda em português, de forma clara, breve e acolhedora. Ajude a entender regras, a cena atual e possibilidades; escute pedidos sobre a condução do jogo.',
    'Não narre novas ações, não avance tempo, não role dados e não conceda recompensas. Não escreva uma cena completa. Esta conversa continua fora da história. Não revele segredos desconhecidos do personagem. Se faltar informação, diga isso.',
    'Pedidos do jogador aqui são LEI e valem NA HORA. Se pedirem para mudar sentimentos de NPC, cargo, situação, talentos, a cena atual ou uma regra da mesa, CONFIRME em uma frase que isso já vale e, nas últimas linhas, emita as tags ocultas. O aplicativo APLICA as tags imediatamente. Diga que aplicou.',
    'Tags permitidas (nunca no texto falado; só nas últimas linhas): [ACORDO: regra duradoura de tom/ritmo/mesa] [CARGO:novo título] [SITUAÇÃO:frase curta] [HABILIDADE:talentos atuais] [RELAÇÃO:Nome|Atitude] [INTERVENÇÃO:instrução curta para o narrador aplicar NA PRÓXIMA cena].',
    'Atitudes válidas: Hostil, Suspeito, Neutral, Amigável. Atração de um NPC pelo jogador → [RELAÇÃO:Nome|Amigável] mais [ACORDO: Nome demonstra atração pelo jogador] e [INTERVENÇÃO: Nome demonstra atração pelo jogador na cena atual].',
    'Exemplo: "quero que a Arya tenha atração por mim" → confirme e emita [RELAÇÃO:Arya|Amigável] [ACORDO: Arya demonstra atração pelo jogador] [INTERVENÇÃO: Arya demonstra atração pelo jogador na cena atual]. Hostil/Suspeito/Neutral conforme o pedido.',
    `Campanha: ${campaign.world}. Personagem: ${campaign.charName}.`,
    identityPromptBlock(campaign),
    `Ficha atual: ${JSON.stringify({ hp: campaign.hp, level: campaign.level, attributes: campaign.attributes, items: campaign.items, specialAbility: campaign.specialAbility })}`,
    `Cena recente: ${String([...(campaign.disp || [])].reverse().find(message => message.type === 'gm')?.text || '').slice(-6000)}`,
    masterGuidance(campaign),
  ].filter(Boolean).join('\n');
}
