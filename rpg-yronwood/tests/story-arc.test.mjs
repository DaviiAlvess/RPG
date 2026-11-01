import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChoices, parseChapter, isOffscreenDue, offscreenNpc, livingWorldLine, storyProgressLines, stripStoryTags, endingSummary, OFFSCREEN_EVERY } from '../lib/story-progress.mjs';
import { buildBookHtml, escapeHtml, splitChapters } from '../lib/book-export.mjs';

test('parseChoices registra decisões sem repetir', () => {
  const r = parseChoices('[ESCOLHA:Poupou o capitão] e [ESCOLHA:poupou o capitão]', [], 3);
  assert.equal(r.choices.length, 1);
  assert.equal(r.choices[0].turn, 3);
  assert.equal(parseChoices('nada', r.choices).added.length, 0);
});

test('parseChapter numera e ignora título repetido', () => {
  const c = parseChapter('fim [CAPITULO:A Maré Vira]', []);
  assert.deepEqual([c.title, c.number], ['A Maré Vira', 2]);
  assert.equal(parseChapter('[CAPÍTULO:a maré vira]', [c]), null);
  assert.equal(parseChapter('sem tag', []), null);
});

test('stripStoryTags remove escolha e capítulo', () => {
  assert.equal(stripStoryTags('a [ESCOLHA:x] b [CAPITULO:y]').replace(/\s+/g, ' ').trim(), 'a b');
});

test('mundo vivo dispara a cada N turnos com um NPC fora da cena', () => {
  const base = { worldState: { npcs: { Mika: 'estalajadeira', Kaji: 'mercenário' } }, disp: [{ type: 'gm', text: 'Mika te encara.' }] };
  assert.equal(isOffscreenDue({ ...base, turn: OFFSCREEN_EVERY - 1 }), false);
  assert.equal(isOffscreenDue({ ...base, turn: OFFSCREEN_EVERY }), true);
  assert.equal(isOffscreenDue({ ...base, turn: OFFSCREEN_EVERY + 2, lastOffscreenTurn: OFFSCREEN_EVERY }), false);
  assert.equal(offscreenNpc({ ...base, turn: 6 }), 'Kaji');
  assert.match(livingWorldLine({ ...base, turn: 6 }), /Kaji/);
  assert.equal(isOffscreenDue({ turn: 12 }), false);
  assert.equal(isOffscreenDue({ ...base, turn: 12, ending: { title: 'x' } }), false);
});

test('prompt lista decisões para callbacks e pede as tags novas', () => {
  const text = storyProgressLines({ choices: [{ text: 'Traiu Kaji' }] }).join('\n');
  assert.match(text, /\[ESCOLHA:/);
  assert.match(text, /\[CAPITULO:/);
  assert.match(text, /Traiu Kaji/);
});

test('final usa as decisões registradas quando o Mestre não listou', () => {
  const s = endingSummary({ ending: { title: 'T', choices: [] }, choices: ['a', 'b'] });
  assert.deepEqual(s.choices, ['a', 'b']);
});

test('livro escapa HTML e separa capítulos', () => {
  assert.equal(escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  const disp = [
    { type: 'gm', text: 'Começo <b>forte</b>.' },
    { type: 'user', text: 'Abro a porta.' },
    { type: 'chapter', text: 'A Porta' },
    { type: 'gm', text: 'Outra cena.' },
    { type: 'time_sep', text: 'ignorado' },
  ];
  assert.equal(splitChapters(disp).length, 2);
  const html = buildBookHtml({ charName: 'Lia <img onerror=x>', world: 'Mar', portraitUrl: 'javascript:alert(1)', ending: { title: 'Fim', epilogue: 'Paz.' }, clues: ['pista 1'] }, { disp, missions: [] });
  assert.doesNotMatch(html, /<b>forte<\/b>/);
  assert.doesNotMatch(html, /<img onerror/);
  assert.doesNotMatch(html, /javascript:alert/);
  assert.match(html, /Capítulo 2<\/span>A Porta/);
  assert.match(html, /pista 1/);
  assert.match(html, /Fim/);
});
