import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURE_PRESETS } from '../lib/adventure-presets.mjs';
import { normalizeGmBrief, gmBriefLines } from '../lib/gm-brief.mjs';
import { economyPrompt } from '../lib/economy.mjs';
import { asPlotList } from '../lib/plots.mjs';

test('toda história pronta tem 3 tramas, bastidores e elenco de 3 vozes', () => {
  for (const p of ADVENTURE_PRESETS) {
    assert.equal(p.plots.length, 3, `${p.id}: 3 tramas`);
    for (const plot of p.plots) {
      assert.ok(plot.title.length <= 80, `${p.id}: título curto (${plot.title})`);
      assert.ok(plot.hook.length <= 220, `${p.id}: gancho cabe sem corte (${plot.hook.length})`);
    }
    assert.deepEqual(asPlotList(p.plots).map((x) => x.hook), p.plots.map((x) => x.hook), `${p.id}: nada cortado`);
    const b = normalizeGmBrief(p.gmBrief);
    assert.ok(b, `${p.id}: gmBrief válido`);
    assert.ok(b.truth.length > 150, `${p.id}: verdade detalhada`);
    assert.ok(b.clues.length >= 3, `${p.id}: pistas`);
    assert.equal(b.escalation.length, 3, `${p.id}: relógio com 3 passos`);
    assert.ok(b.twist, `${p.id}: virada`);
    assert.ok(Object.keys(b.agendas).length >= 2, `${p.id}: agendas`);
    assert.ok(p.gmBrief.truth.length <= 700, `${p.id}: verdade não é cortada (${p.gmBrief.truth.length})`);
    assert.ok(Object.keys(p.worldState.npcs).length >= 2, `${p.id}: NPCs no diário`);
    assert.ok(p.hook.length <= 160, `${p.id}: chamada do card curta (${p.hook.length})`);
  }
});

test('mundos originais trazem descrição própria e não pedem busca na rede', () => {
  const originals = ADVENTURE_PRESETS.filter((p) => !p.isKnownIP);
  assert.ok(originals.length >= 4);
  for (const p of originals) assert.match(p.worldBg, /Mundo original/);
});

test('bastidores não vão para a lista de segredos visível ao jogador', () => {
  for (const p of ADVENTURE_PRESETS) {
    assert.ok(!p.worldState.secrets || !p.worldState.secrets.length, `${p.id}: sem segredos públicos`);
  }
});

test('gmBriefLines monta o bloco do Mestre e o modo curto omite a virada', () => {
  const c = ADVENTURE_PRESETS[0];
  const full = gmBriefLines(c).join('\n');
  assert.match(full, /BASTIDORES DO MESTRE/);
  assert.match(full, /Relógio/);
  assert.match(full, /Virada/);
  const short = gmBriefLines(c, { short: true });
  assert.equal(short.length, 1);
  assert.doesNotMatch(short[0], /Virada/);
  assert.deepEqual(gmBriefLines({}), []);
  assert.equal(normalizeGmBrief('x'), null);
});

test('modo economia inclui os bastidores', () => {
  const p = ADVENTURE_PRESETS.find((x) => x.id === 'sertao-arcano');
  const prompt = economyPrompt({ ...p, items: [], missions: [] }, '', '1 de janeiro');
  assert.match(prompt, /BASTIDORES DO MESTRE/);
  assert.match(prompt, /Mãe-d'Água Seca/);
});
