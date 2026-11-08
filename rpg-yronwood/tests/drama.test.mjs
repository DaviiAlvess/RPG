import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseThreatTags, threatDue, advanceThreat, dramaPatch, dramaPromptLines, actOf, dramaBeat, midpointDue, stripDramaTags, THREAT_EVERY } from '../lib/drama.mjs';

test('ameaça nasce pela tag e avança sozinha se o jogador não agir', () => {
  const t = parseThreatTags('Ele some na névoa. [AMEACA:Jarl Haakon|tomar Kattegat antes do inverno]', null, 5);
  assert.deepEqual([t.name, t.stage, t.lastTurn], ['Jarl Haakon', 1, 5]);
  const camp = { turn: 5 + THREAT_EVERY, threat: t };
  assert.ok(threatDue(camp));
  assert.match(dramaPromptLines(camp).join(' '), /A AMEAÇA AVANÇA NESTA RESPOSTA/);
  const after = dramaPatch(camp, 'cena qualquer', camp.turn + 1).threat;
  assert.equal(after.stage, 2);
  assert.equal(threatDue({ turn: camp.turn + 1, threat: after }), false);
});

test('jogador freia a ameaça e ela recua; vencida some do prompt', () => {
  const camp = { turn: 20, threat: { name: 'Culto', goal: 'abrir o portão', stage: 3, lastTurn: 10 } };
  const back = dramaPatch(camp, 'O ritual é interrompido. [AMEACA_RECUA]', 21).threat;
  assert.equal(back.stage, 2);
  const dead = dramaPatch(camp, '[AMEACA_VENCIDA]', 21).threat;
  assert.ok(dead.defeated);
  assert.doesNotMatch(dramaPromptLines({ turn: 21, threat: dead }).join(' '), /AMEAÇA:/);
  assert.equal(stripDramaTags('Fim. [AMEACA_RECUA] [AMEAÇA:X|y]'), 'Fim.  ');
});

test('sem ameaça, o Mestre é cobrado a criar uma depois do começo', () => {
  assert.match(dramaPromptLines({ turn: 4 }).join(' '), /\[AMEACA:quem\|o que quer\]/);
  assert.doesNotMatch(dramaPromptLines({ turn: 1 }).join(' '), /AMEAÇA CENTRAL/);
});

test('atos e virada do meio', () => {
  assert.equal(actOf({ turn: 2 }).id, 'gancho');
  assert.equal(actOf({ turn: 15 }).id, 'complicacoes');
  assert.equal(actOf({ turn: 50 }).id, 'crise');
  assert.equal(actOf({ turn: 10, threat: { name: 'X', stage: 4 } }).id, 'climax');
  const mid = { turn: 30, worldState: { secrets: ['o irmão vendeu a vila'] } };
  assert.ok(midpointDue(mid));
  assert.match(dramaBeat(mid).line, /VIRADA/);
  assert.equal(dramaPatch(mid, '', 31).midpointTurn, 31);
  assert.equal(midpointDue({ ...mid, midpointTurn: 31 }), false);
});

test('momentos marcados: dilema, passado do personagem, no máximo um por turno', () => {
  assert.equal(dramaBeat({ turn: 22, midpointTurn: 1 }).id, 'dilema');
  const bg = { turn: 13, midpointTurn: 1, charBg: 'Cresceu num porto pobre. Deve dinheiro ao contrabandista Ulf desde menino.' };
  assert.equal(dramaBeat(bg).id, 'passado');
  assert.equal(dramaBeat({ ...bg }, { busy: true }), null);
  const lines = dramaPromptLines({ turn: 22, midpointTurn: 1 });
  assert.equal(lines.filter((l) => /DILEMA|PASSADO|SEGREDO|PROMESSA|VIRADA/.test(l)).length, 1);
  assert.ok(lines.some((l) => /CAMADAS DE UMA RESPOSTA COMPLETA/.test(l)));
});

import { ADVENTURE_PRESETS } from '../lib/adventure-presets.mjs';
test('histórias prontas: ameaça, elenco maior, protagonista masculino e virada dos bastidores', () => {
  for (const p of ADVENTURE_PRESETS) {
    assert.ok(p.threat?.name && p.threat?.goal, `${p.id}: ameaça central`);
    assert.ok(Object.keys(p.worldState.npcs).length >= 4, `${p.id}: elenco`);
  }
  const fem = ['Lia Maré', 'Clara Vale', 'Mila dos Juncos', 'Edda Freixo', 'Hana Mori', 'Bia Torres', 'Cícera do Riacho', 'Duda Ferraz', 'Kiri de Yu Dao'];
  assert.ok(!ADVENTURE_PRESETS.some((p) => fem.includes(p.charName)));
  for (const id of ['westeros', 'got-muralha', 'got-danca-dragoes', 'got-porto-real']) assert.ok(ADVENTURE_PRESETS.find((p) => p.id === id), id);
  const got = ADVENTURE_PRESETS.find((p) => p.id === 'westeros');
  const camp = { ...got, turn: 8, threat: { ...got.threat, stage: 1, lastTurn: 0 } };
  assert.match(dramaPromptLines(camp).join(' '), /Merrick e dois homens revistam a estalagem/);
  assert.match(dramaBeat({ ...got, turn: 30 }).line, /Sor Willem, o pai, sabia do plano/);
});
