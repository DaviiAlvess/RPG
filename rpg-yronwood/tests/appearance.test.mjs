import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_OPTIONS,
  DEFAULT_APP,
  buildAppearance,
  appearanceForGm,
  portraitPrompt,
  portraitUrl,
  portraitIsCurrent,
  sceneSeed,
  sceneImageUrl,
  hashSeed,
} from '../lib/appearance.mjs';

const edric = {
  charName: 'Edric Yronwood',
  charAge: '26',
  world: 'Westeros',
  appearance: { ...DEFAULT_APP, body: 'Atlético', skin: 'Morena', hairColor: 'Preto', extras: 'Cicatriz' },
};

test('padrão usa opções válidas', () => {
  for (const [key, value] of Object.entries(DEFAULT_APP)) {
    assert.ok(APP_OPTIONS[key].includes(value), `${key}=${value}`);
  }
});

test('buildAppearance aceita save antigo sem presentation', () => {
  const old = { body: 'Atlético', height: 'Alto', skin: 'Morena', hairLen: 'Curto', hairColor: 'Preto', hairStyle: 'Liso', eyeColor: 'Castanhos', eyeShape: 'Amendoados', face: 'Quadrada', extras: 'Nenhum' };
  const text = buildAppearance(old);
  assert.match(text, /^Aparência: corpo atlético, estatura alto, pele morena/);
  assert.doesNotMatch(text, /undefined|marca especial/);
});

test('appearanceForGm: save antigo com nota mantém só a nota', () => {
  const lines = appearanceForGm({ appearance: DEFAULT_APP, charAppearanceNote: 'Mãos calejadas.' });
  assert.deepEqual(lines, ['Aparência canônica: Mãos calejadas.']);
});

test('appearanceForGm: chips personalizados entram junto com nota e roupa', () => {
  const lines = appearanceForGm({ appearance: edric.appearance, appearanceCustomized: true, charAppearanceNote: 'Mãos calejadas.', charOutfit: 'manto de areia' });
  assert.equal(lines.length, 3);
  assert.match(lines[0], /pele morena/);
  assert.match(lines[2], /manto de areia/);
});

test('portraitPrompt é em inglês, não usa o nome e traduz traços', () => {
  const p = portraitPrompt(edric);
  assert.doesNotMatch(p, /Edric|Yronwood/);
  assert.match(p, /26-year-old athletic man/);
  assert.match(p, /brown skin/);
  assert.match(p, /black hair/);
  assert.match(p, /facial scar/);
  assert.match(p, /Westeros setting/);
});

test('careca não descreve cor nem estilo de cabelo', () => {
  const p = portraitPrompt({ appearance: { ...DEFAULT_APP, hairLen: 'Careca' } });
  assert.match(p, /bald head/);
  assert.doesNotMatch(p, /hair,/);
});

test('portraitUrl é estável com a mesma semente e muda com outra', () => {
  const a = portraitUrl({ ...edric, portraitSeed: 42 });
  assert.equal(a, portraitUrl({ ...edric, portraitSeed: 42 }));
  assert.notEqual(a, portraitUrl({ ...edric, portraitSeed: 43 }));
  assert.match(a, /seed=42$/);
  assert.match(a, /^https:\/\/image\.pollinations\.ai\/prompt\//);
});

test('portraitIsCurrent detecta aparência alterada', () => {
  const c = { ...edric, portraitSeed: 7 };
  c.portraitUrl = portraitUrl(c);
  assert.equal(portraitIsCurrent(c), true);
  assert.equal(portraitIsCurrent({ ...c, appearance: { ...c.appearance, hairColor: 'Ruivo' } }), false);
  assert.equal(portraitIsCurrent({ ...edric }), false);
});

test('sceneSeed repete para o mesmo lugar e ignora caixa/espaços', () => {
  assert.equal(sceneSeed('Westeros', 'Pedra Sangrenta'), sceneSeed('westeros', '  pedra   sangrenta '));
  assert.notEqual(sceneSeed('Westeros', 'Pedra Sangrenta'), sceneSeed('Westeros', 'Porto Real'));
  assert.equal(hashSeed('x'), hashSeed('x'));
});

test('sceneImageUrl usa a semente do local', () => {
  const url = sceneImageUrl('stone hall', 'Westeros', 'Pedra Sangrenta');
  assert.match(url, new RegExp(`seed=${sceneSeed('Westeros', 'Pedra Sangrenta')}$`));
});

test('npcPortraitUrl é estável por NPC e não usa o nome', async () => {
  const { npcPortraitUrl } = await import('../lib/appearance.mjs');
  const a = npcPortraitUrl('Mika', 'estalajadeira; seca e protetora; vale', 'Naruto');
  assert.equal(a, npcPortraitUrl('Mika', 'estalajadeira; seca e protetora; vale', 'Naruto'));
  assert.equal(a.split('seed=')[1], npcPortraitUrl('mika', 'outra coisa', 'naruto').split('seed=')[1]);
  assert.doesNotMatch(decodeURIComponent(a), /Mika/);
  assert.match(decodeURIComponent(a), /estalajadeira/);
});
