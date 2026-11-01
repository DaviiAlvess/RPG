import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textForSpeech, chunkForSpeech, sortVoices, pickVoice, readVoicePrefs, createNarrator } from '../lib/voice-narration.mjs';

test('textForSpeech limpa tags, markdown e links', () => {
  assert.equal(textForSpeech('**Bento**: "Vai." [PISTA:x] veja https://a.b/c — fim'), 'Bento : "Vai." veja , fim');
});

test('chunkForSpeech respeita o limite e corta em frases', () => {
  const long = 'Frase um curta. ' + 'Palavra '.repeat(80) + 'fim. Outra frase.';
  const chunks = chunkForSpeech(long, 120);
  assert.ok(chunks.length > 2);
  assert.ok(chunks.every((c) => c.length <= 120), chunks.map((c) => c.length).join(','));
  assert.equal(chunks[0], 'Frase um curta.');
  assert.deepEqual(chunkForSpeech(''), []);
});

test('vozes em português primeiro e preferência salva', () => {
  const voices = [{ name: 'Z', lang: 'en-US', voiceURI: 'z' }, { name: 'B', lang: 'pt-PT', voiceURI: 'b' }, { name: 'A', lang: 'pt-BR', voiceURI: 'a' }];
  assert.deepEqual(sortVoices(voices).map((v) => v.voiceURI), ['a', 'b', 'z']);
  assert.equal(pickVoice(voices, 'z').voiceURI, 'z');
  assert.equal(pickVoice(voices, 'nao-existe').voiceURI, 'a');
  assert.equal(pickVoice([], 'a'), null);
});

test('preferências inválidas voltam ao padrão seguro', () => {
  const store = { getItem: () => '{"auto":1,"rate":9,"voiceURI":5}' };
  assert.deepEqual(readVoicePrefs(store), { auto: true, voiceURI: '5', rate: 1.6, pitch: 1 });
  assert.equal(readVoicePrefs({ getItem: () => 'lixo' }).rate, 1);
});

test('narrador fala em trechos e nova fala cancela a anterior', () => {
  const spoken = [];
  let cancels = 0;
  const synth = { getVoices: () => [{ name: 'A', lang: 'pt-BR', voiceURI: 'a' }], speak: (u) => spoken.push(u), cancel: () => { cancels++; } };
  function U(text) { this.text = text; }
  const n = createNarrator(synth, U);
  assert.equal(n.supported, true);
  const states = [];
  n.onChange((v) => states.push(v));
  n.speak('Uma. Duas.', { rate: 1.2 });
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].lang, 'pt-BR');
  assert.equal(spoken[0].rate, 1.2);
  spoken[0].onend();
  assert.deepEqual(states, [true, false]);
  n.speak('Outra.');
  n.stop();
  assert.ok(cancels >= 2);
  assert.equal(createNarrator(null, null).speak('x'), false);
});
