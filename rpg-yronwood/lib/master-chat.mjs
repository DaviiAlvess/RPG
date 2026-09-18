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
    'Pedidos aplicados em Falar com o Mestre são FATO da mesa (atração, cargo, correção de cena, relações). Mostre isso na narração. Isso prevalece sobre a regra de não dar intimidade gratuita com protagonistas quando o jogador pediu na conversa com o Mestre. Não invente XP, itens ou recompensas só por um acordo de tom.',
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
    changes.intervencao && 'Intervenção na cena',
  ].filter(Boolean).join('. ');
}

export function masterInterventionContext(note, { short = false } = {}) {
  const text = String(note || '').trim();
  if (!text) return '';
  const head = short ? 'CONTEXTO INTERNO' : 'CONTEXTO INTERNO (não é fala do jogador)';
  return `${head}: INTERVENÇÃO DO MESTRE — aplique AGORA nesta narração (atração de NPC, cargo, retcon ou correção da cena). Isso é FATO da mesa e prevalece sobre a regra de não dar intimidade gratuita com protagonistas: ${text}`;
}

const requestNorm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function isMasterChangeRequest(text) {
  const n = requestNorm(text);
  const wantsChange = /(quero que|faz (com )?que|faca |peco que|muda|mudar|corrige|corrigir|intervir|interven|aplica)/.test(n);
  const hasTarget = /(atra[cç]|apaixon|interesse|romance|namor|cargo|situacao|relacao|cena|intimidade|trate|olhe|sinta)/.test(n);
  return (wantsChange && hasTarget) || /(atra[cç]|apaixon|romance|namor)/.test(n);
}

function namesFromSupportingCast(text) {
  const found = [];
  for (const match of String(text || '').matchAll(/\b([A-ZÁÉÍÓÚÂÊÔÃ][\p{L}'-]{2,40})(?:\s+[A-ZÁÉÍÓÚÂÊÔÃ][\p{L}'-]{2,40})?\b/gu)) {
    found.push(match[0].trim());
  }
  return found;
}

export function inferNpcNameFromRequest(campaign = {}, question = '') {
  const names = [
    ...Object.keys(campaign.relationships || {}),
    ...Object.keys(campaign.worldState?.npcs || {}),
    ...namesFromSupportingCast(campaign.supportingCast),
  ].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(question)) return name;
  }
  const match = String(question || '').match(/(?:que(?:\s+(?:a|o|as|os))?|para a|para o|pra)\s+([A-ZÁÉÍÓÚÂÊÔÃ][\p{L}'-]{1,40})/u);
  return match ? match[1] : '';
}

export function inferMasterTags(campaign, question) {
  if (!isMasterChangeRequest(question)) return [];
  const npc = inferNpcNameFromRequest(campaign, question);
  const attraction = /atra[cç]|apaixon|romance|namor|interesse (em mim|por mim|romant)/.test(requestNorm(question));
  if (attraction) {
    const who = npc || 'O NPC da cena';
    const tags = [];
    if (npc) tags.push(`[RELAÇÃO:${npc}|Amigável]`);
    tags.push(`[ACORDO: ${who} demonstra atração pelo jogador]`);
    tags.push(`[INTERVENÇÃO: ${who} demonstra atração pelo jogador na cena atual]`);
    return tags;
  }
  const note = String(question || '').trim().slice(0, MASTER_INTERVENTION_MAX);
  return note ? [`[INTERVENÇÃO: ${note}]`] : [];
}

function mergeInferredMasterTags(gmText, inferred = []) {
  let tagged = String(gmText || '');
  if (!inferred.length) return tagged;
  const hasRel = /\[RELA[CÇ][AÃ]O:/i.test(tagged);
  const hasAcordo = parseAcordoTags(tagged).length > 0;
  const hasInter = parseIntervencaoTags(tagged).length > 0;
  const extra = inferred.filter(tag => {
    if (/\[RELA[CÇ][AÃ]O:/i.test(tag)) return !hasRel;
    if (/\[ACORDO:/i.test(tag)) return !hasAcordo;
    if (/\[INTERVEN/i.test(tag)) return !hasInter;
    return true;
  });
  return extra.length ? `${tagged}\n${extra.join('\n')}` : tagged;
}

export const MASTER_BEAT_PREFIX = '[O Mestre da mesa aplicou:';

export function buildMasterBeatMessage(note) {
  const text = String(note || 'o pedido da mesa').trim().slice(0, MASTER_INTERVENTION_MAX);
  return `${MASTER_BEAT_PREFIX} ${text}]
Isto não é uma ação do personagem. Continue a CENA ATUAL (não avance tempo). Em um beat curto, mostre o pedido já valendo — olhar, gesto, tom, como o NPC trata o jogador agora. Não recuse por ser protagonista ou por intimidade. Não fale, escolha ou sinta pelo jogador.`;
}

export function isMasterBeatMessage(text) {
  return String(text || '').trim().startsWith(MASTER_BEAT_PREFIX);
}

export function masterBeatDisplay() {
  return 'O Mestre aplicou o pedido na cena.';
}

/** Aplica tags da conversa com o Mestre ao estado da campanha, sem narrar. */
export function applyMasterChatReply(campaign = {}, gmText = '', playerRequest = '') {
  let tagged = mergeInferredMasterTags(gmText, inferMasterTags(campaign, playerRequest));
  const extracted = parseAcordoTags(tagged);
  const merged = extracted.length
    ? mergeMasterAgreements(campaign, extracted)
    : { list: listMasterAgreements(campaign), added: [] };
  const identity = parseIdentityTags(tagged, campaign);
  const relationships = parseRelationships(tagged, campaign.relationships || {});
  const incoming = parseIntervencaoTags(tagged).join(' ').trim().slice(0, MASTER_INTERVENTION_MAX);
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
    needsSceneBeat: Boolean(changes.intervencao || changes.relacao || changes.cargo),
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
    'Tags permitidas (nunca no texto falado; só nas últimas linhas): [ACORDO: regra duradoura de tom/ritmo/mesa] [CARGO:novo título] [SITUAÇÃO:frase curta] [HABILIDADE:talentos atuais] [RELAÇÃO:Nome|Atitude] [INTERVENÇÃO:instrução curta para o narrador aplicar NA CENA ATUAL].',
    'Atitudes válidas: Hostil, Suspeito, Neutral, Amigável. Atração de um NPC pelo jogador → [RELAÇÃO:Nome|Amigável] mais [ACORDO: Nome demonstra atração pelo jogador] e [INTERVENÇÃO: Nome demonstra atração pelo jogador na cena atual].',
    'Exemplo: "quero que a Arya tenha atração por mim" → confirme e emita [RELAÇÃO:Arya|Amigável] [ACORDO: Arya demonstra atração pelo jogador] [INTERVENÇÃO: Arya demonstra atração pelo jogador na cena atual]. Hostil/Suspeito/Neutral conforme o pedido.',
    `Campanha: ${campaign.world}. Personagem: ${campaign.charName}.`,
    identityPromptBlock(campaign),
    `Ficha atual: ${JSON.stringify({ hp: campaign.hp, level: campaign.level, attributes: campaign.attributes, items: campaign.items, specialAbility: campaign.specialAbility })}`,
    `Cena recente: ${String([...(campaign.disp || [])].reverse().find(message => message.type === 'gm')?.text || '').slice(-6000)}`,
    masterGuidance(campaign),
  ].filter(Boolean).join('\n');
}
