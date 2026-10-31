import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURE_PRESETS, filterPresets, PRESET_TONES } from '../lib/adventure-presets.mjs';
import { sanitizeTemplate, campaignToTemplate, encodeTemplate, decodeTemplate, shareUrl, readSharedFromHash } from '../lib/story-share.mjs';

test('link de história faz ida e volta preservando tramas e bastidores', () => {
  const preset = ADVENTURE_PRESETS.find((p) => p.id === 'sertao-arcano');
  const url = shareUrl(preset, 'https://rpg.exemplo.app/');
  assert.match(url, /^https:\/\/rpg\.exemplo\.app\/#historia=[A-Za-z0-9_-]+$/);
  const back = readSharedFromHash(new URL(url).hash);
  assert.equal(back.charName, 'Cícera do Riacho');
  assert.equal(back.plots.length, 3);
  assert.match(back.gmBrief.truth, /Mãe-d'Água/);
  assert.equal(back.shared, true);
  assert.equal(back.isKnownIP, false);
});

test('decodeTemplate rejeita lixo e campos perigosos', () => {
  assert.equal(decodeTemplate('isso-nao-e-base64-valido!!'), null);
  assert.equal(decodeTemplate(''), null);
  const evil = encodeTemplate({ world: 'X', charName: 'Y', relationships: { A: 'Amigável', B: '<script>' }, __proto__: { polluted: true } });
  const t = decodeTemplate(evil);
  assert.deepEqual(t.relationships, { A: 'Amigável' });
  assert.equal({}.polluted, undefined);
  assert.equal(sanitizeTemplate({ world: 'só mundo' }), null);
});

test('campaignToTemplate não leva progresso, memória nem inventário', () => {
  const camp = {
    world: 'Mundo', charName: 'Ana', storyStartPoint: 'Começo forte.', memory: 'segredos da sessão', items: ['espada'], hp: 12,
    msgs: [{ role: 'user', content: 'oi' }], plots: [{ title: 'Aberta', status: 'ativa' }, { title: 'Feita', status: 'encerrada' }],
    worldState: { location: 'Porto', npcs: { Bia: 'guarda' }, secrets: ['x'], promises: ['y'] },
  };
  const t = campaignToTemplate(camp, 'davi');
  assert.equal(t.memory, undefined);
  assert.equal(t.items, undefined);
  assert.equal(t.msgs, undefined);
  assert.deepEqual(t.plots.map((p) => p.title), ['Aberta']);
  assert.deepEqual(Object.keys(t.worldState), ['location', 'npcs']);
  assert.equal(t.author, 'davi');
  assert.ok(t.id.startsWith('u'));
  assert.equal(t.hook, 'Começo forte.');
});

test('filtros da biblioteca', () => {
  assert.ok(ADVENTURE_PRESETS.every((p) => PRESET_TONES.includes(p.tone)));
  const terror = filterPresets(ADVENTURE_PRESETS, { tone: 'Terror' });
  assert.ok(terror.length >= 4 && terror.every((p) => p.tone === 'Terror'));
  const originals = filterPresets(ADVENTURE_PRESETS, { origin: 'original' });
  assert.ok(originals.every((p) => !p.isKnownIP));
  assert.deepEqual(filterPresets(ADVENTURE_PRESETS, { query: 'sertão' }).map((p) => p.id), ['sertao-arcano']);
  assert.equal(filterPresets(ADVENTURE_PRESETS, { query: 'zzzz' }).length, 0);
});
