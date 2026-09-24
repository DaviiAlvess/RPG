import { skillForAttribute } from './progression.mjs';
import { asPlotList } from './plots.mjs';

export const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const attributeKeys = { forca: 'strength', destreza: 'dexterity', mente: 'mind', carisma: 'charisma' };
export function parseTest(text) {
  const match = String(text).match(/\[TESTE:([^\]|]+)(?:\|DC:(\d+))?\]\s*([^\n]*)/i);
  if (!match || !attributeKeys[normalize(match[1].trim())]) return null;
  return { attribute: match[1].trim(), description: match[3], difficulty: Math.max(5, Math.min(30, Number(match[2]) || 12)) };
}
export function resolveTest(test, attributes, roll, skills = {}) {
  const attrMod = Math.floor(((Number(attributes[attributeKeys[normalize(test.attribute)]]) || 10) - 10) / 2);
  const skillBonus = Math.max(0, (Number(skills[skillForAttribute(test.attribute)]) || 1) - 1);
  const total = roll + attrMod + skillBonus;
  const outcome = roll === 1 ? 'falha crítica' : roll === 20 ? 'sucesso crítico' : total >= test.difficulty ? 'sucesso' : total >= test.difficulty - 3 ? 'sucesso parcial com custo' : 'falha';
  return { total, modifier: attrMod, skillBonus, outcome };
}
export function pendingTestFromMessages(messages = []) {
  const last = messages.at(-1);
  return last?.role === 'assistant' ? parseTest(last.content) : null;
}
export function itemEffect(name) {
  const text = normalize(name).trim();
  if (/^(pocao|elixir) (de )?(cura|vida|saude)(\b|$)/.test(text)) return { consume: true, heal: 20 };
  if (/^(comida|racao|pao|fruta)(\b|$)/.test(text)) return { consume: true, heal: 5 };
  return { consume: false, heal: 0 };
}
export function newerCampaign(local, cloud) {
  if (!local?.id) return cloud;
  if (!cloud?.id) return local;
  return new Date(local.updatedAt || 0).getTime() > new Date(cloud.updatedAt || 0).getTime() ? local : cloud;
}

const CAMPAIGN_PERSIST_FIELDS = [
  'charTitle', 'charOriginTitle', 'charSituation', 'charSkills',
  'charBg', 'storyStartPoint', 'pendingMasterNote',
  'masterAgreements', 'masterGuidance', 'masterChat',
];

function hasPersistValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function asItemList(value) {
  return Array.isArray(value) ? value.slice() : [];
}

export function asMissionList(value) {
  return Array.isArray(value) ? value.slice() : [];
}

export function emptyStoryLists() {
  return { items: [], missions: [], plots: [] };
}

/** Preset/template id never becomes the persist key of a playable story. */
export function stripTemplateCampaignId(record) {
  if (!record || typeof record !== 'object') return {};
  const { id, items, missions, plots, ...rest } = record;
  if (id != null && String(id).trim() && !rest.presetId) rest.presetId = String(id);
  return rest;
}

export function pinStoryIdentity(record, persistId) {
  if (persistId == null || persistId === '') return { ...(record || {}) };
  const next = { ...(record || {}), id: String(persistId) };
  if (record?.id != null && String(record.id) !== String(persistId) && !next.presetId) {
    next.presetId = String(record.id);
  }
  return next;
}

/**
 * Inventário e missões pertencem só à história persistId.
 * O estado da sessão só entra quando a história aberta é a mesma.
 */
export function storyListsFor(persistId, record, session = {}) {
  const id = persistId != null ? String(persistId) : '';
  if (!id) return emptyStoryLists();
  const recordId = record?.id != null ? String(record.id) : '';
  const sessionId = session.activeId != null ? String(session.activeId) : '';
  const items = recordId === id
    ? asItemList(record.items)
    : (sessionId === id ? asItemList(session.items) : []);
  const missions = recordId === id
    ? asMissionList(record.missions)
    : (sessionId === id ? asMissionList(session.missions) : []);
  const plots = recordId === id
    ? asPlotList(record.plots)
    : (sessionId === id ? asPlotList(session.plots) : []);
  return { items, missions, plots };
}

export function bindStoryLists(persistId, record, session = {}, overrides = {}) {
  const lists = storyListsFor(persistId, record, session);
  const pinned = pinStoryIdentity(record, persistId);
  return {
    ...pinned,
    items: Object.prototype.hasOwnProperty.call(overrides, 'items') ? asItemList(overrides.items) : lists.items,
    missions: Object.prototype.hasOwnProperty.call(overrides, 'missions') ? asMissionList(overrides.missions) : lists.missions,
    plots: Object.prototype.hasOwnProperty.call(overrides, 'plots') ? asPlotList(overrides.plots) : lists.plots,
  };
}

/** Escolhe o save mais novo e recupera identidade/acordos se a cópia vencedora os tiver perdido. */
export function mergeCampaignRecords(local, cloud) {
  const chosen = newerCampaign(local, cloud);
  const other = chosen === local ? cloud : local;
  if (!chosen) return other ?? null;
  if (!other) return chosen;
  const next = { ...chosen };
  for (const key of CAMPAIGN_PERSIST_FIELDS) {
    if (!hasPersistValue(next[key]) && hasPersistValue(other[key])) next[key] = other[key];
  }
  return next;
}

export function mergeCampaignIndex(cloud = [], local = []) {
  const byId = new Map();
  for (const item of Array.isArray(local) ? local : []) {
    if (item?.id == null) continue;
    byId.set(String(item.id), item);
  }
  for (const item of Array.isArray(cloud) ? cloud : []) {
    if (item?.id == null) continue;
    const id = String(item.id);
    byId.set(id, newerCampaign(byId.get(id), item));
  }
  return [...byId.values()].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}
export function readWorldState(text, previous = {}) {
  const next = { ...previous, npcs: { ...(previous.npcs || {}) }, promises: [...(previous.promises || [])], secrets: [...(previous.secrets || [])] };
  for (const match of String(text).matchAll(/\[(LOCAL|PROMESSA|SEGREDO|NPC):([^\]]+)\]/gi)) {
    const value = match[2].trim().slice(0, 500);
    if (match[1].toUpperCase() === 'LOCAL') next.location = value;
    if (match[1].toUpperCase() === 'NPC') {
      const [name, ...facts] = value.split('|');
      const key = name.trim().replace(/[.#$\[\]\/]/g, ' ').trim();
      if (key && !['__proto__', 'constructor', 'prototype'].includes(key) && facts.length) next.npcs[key] = facts.join('|').trim();
    }
    const field = match[1].toUpperCase() === 'PROMESSA' ? 'promises' : match[1].toUpperCase() === 'SEGREDO' ? 'secrets' : null;
    if (field && !next[field].includes(value)) next[field] = [...next[field], value].slice(-40);
  }
  return next;
}
