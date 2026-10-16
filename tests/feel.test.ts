/// <reference types="node" />
// Lancer : npm test
// Série d'affilée (son qui monte, textes), défilement de la page module,
// déroulé du coffre

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runShout, runValLine } from '../src/utils/accuracy';
import { CHEST_MAX_MS, chestTimeline, fountainPoint, growingShake } from '../src/utils/chestTimeline';
import { revealScroll } from '../src/utils/modulePath';
import { correctRate, RUN_PITCH_SEMITONES, semitoneRate, SOUND_VARIANTS } from '../src/utils/soundRules';

test('son de la bonne réponse : il monte dans une série, puis reste à la dernière hauteur', () => {
  assert.equal(correctRate(0), 1);
  assert.equal(correctRate(2), 1, 'hors série : hauteur normale');
  assert.equal(correctRate(3), semitoneRate(2));
  assert.equal(correctRate(4), semitoneRate(4));
  assert.equal(correctRate(5), semitoneRate(5));
  assert.equal(correctRate(12), semitoneRate(5));
  assert.equal(semitoneRate(0), 1);
  assert.equal(semitoneRate(12), 2);
  // Chaque hauteur est préparée d'avance (un lecteur par hauteur)
  for (const st of RUN_PITCH_SEMITONES.slice(1)) {
    assert.ok(SOUND_VARIANTS.some((v) => v.name === 'correct' && v.rate === semitoneRate(st) && v.gain === undefined));
  }
});

test('série : grand texte et réplique de Val', () => {
  assert.equal(runShout(3), '3 d’affilée !');
  assert.equal(runValLine(3), '3 d’affilée ! Continue !');
  assert.equal(runValLine(5), '5 d’affilée, tu es en feu !');
  assert.equal(runValLine(10), '10 d’affilée, inarrêtable !');
});

test('page module : pas de défilement si le rond et sa carte sont visibles, sinon juste assez', () => {
  const base = { scrollY: 400, viewport: 600, maxScroll: 3000, margin: 16 };
  // Entièrement visible : rien
  assert.equal(revealScroll({ ...base, top: 450, bottom: 900 }), null);
  // Dépasse en bas : on descend juste assez (bas + marge = haut de l'écran + 600)
  assert.equal(revealScroll({ ...base, top: 700, bottom: 1100 }), 1100 + 16 - 600);
  // Caché en haut : on remonte juste assez
  assert.equal(revealScroll({ ...base, top: 300, bottom: 500 }), 300 - 16);
  // Plus haut que l'écran : on montre le haut
  assert.equal(revealScroll({ ...base, top: 900, bottom: 1700 }), 900 - 16);
  // Bornes du contenu
  assert.equal(revealScroll({ ...base, scrollY: 100, top: 5, bottom: 50 }), 0);
  assert.equal(revealScroll({ ...base, maxScroll: 500, top: 900, bottom: 1100 }), 500);
  assert.equal(revealScroll({ ...base, viewport: 0, top: 0, bottom: 10 }), null);
});

test('coffre : trois temps en 3 secondes au plus, quelle que soit la rareté', () => {
  for (let stages = 1; stages <= 4; stages++) {
    const t = chestTimeline(stages);
    assert.equal(t.steps.length, stages - 1);
    assert.ok(t.steps.every((ms) => ms < t.open), 'paliers pendant l’anticipation');
    assert.ok(t.leak < t.open && t.leak > 0, 'la lumière filtre avant l’ouverture');
    assert.ok(t.open < t.stamp && t.stamp <= t.count && t.count < t.end, 'retombée après le moment fort');
    assert.ok(t.end <= CHEST_MAX_MS, `${stages} raretés : ${t.end} ms`);
  }
  assert.deepEqual(chestTimeline(9).steps.length, 3, 'au plus 4 raretés');
});

test('coffre : tremblement qui grandit, gerbe en arc qui retombe', () => {
  const shakes = growingShake(900, 90, 1.5, 7);
  assert.equal(shakes.length, 10);
  assert.equal(shakes[0], 1.5);
  assert.equal(shakes[shakes.length - 1], 7);
  assert.ok(shakes.every((a, i) => i === 0 || a > shakes[i - 1]));
  const up = fountainPoint(100, -600, 1150, 0.3);
  const down = fountainPoint(100, -600, 1150, 1);
  assert.ok(up.y < 0, 'monte d’abord');
  assert.ok(down.y > up.y, 'puis retombe');
  assert.equal(down.x, 100);
});
