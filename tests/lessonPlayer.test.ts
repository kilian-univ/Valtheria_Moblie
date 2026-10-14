/// <reference types="node" />
// Lancer : npm test
// Lecteur de leçon : pastille d'affilée, grands chiffres, révélation, bouton
// principal (utils/lessonPlayer.ts, utils/fit.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { discoveryLesson } from '../src/lesson/discovery';
import type { LessonScreen, RevealScreen } from '../src/lesson/model';
import { normalizeScreen } from '../src/lesson/normalize';
import { fitFontSize, textWidthEm } from '../src/utils/fit';
import {
  canContinue,
  estimateVerdict,
  primaryLabel,
  RUN_MIN,
  revealExtraLines,
  runBadge,
} from '../src/utils/lessonPlayer';

const NBSP = '\u00A0';

function reveal(objective: Parameters<typeof discoveryLesson>[0]): RevealScreen {
  const screen = discoveryLesson(objective).screens.find((s) => s.kind === 'reveal');
  assert.ok(screen && screen.kind === 'reveal');
  return screen;
}

// ---------------------------------------------------------------------------
// Pastille d'affilée
// ---------------------------------------------------------------------------
test('pastille d’affilée : à partir de 3 bonnes réponses du premier coup', () => {
  assert.equal(RUN_MIN, 3);
  assert.equal(runBadge(0), null);
  assert.equal(runBadge(2), null);
  assert.equal(runBadge(3), 3);
  assert.equal(runBadge(7), 7);
  assert.equal(runBadge(Number.NaN), null);
});

// ---------------------------------------------------------------------------
// Grands chiffres sur une ligne
// ---------------------------------------------------------------------------
test('grand chiffre : taille gardée s’il tient, réduite sinon, jamais sous le minimum', () => {
  // « 850 € » tient à 78 sur un écran de 350 px
  assert.equal(fitFontSize(`850${NBSP}€`, 78, 28, 350), 78);
  // « 300 000 € » ne tient pas à 92 sur un iPhone SE (335 px) : réduit
  const text = `300 000${NBSP}€`;
  const size = fitFontSize(text, 92, 28, 335);
  assert.ok(size < 92);
  assert.ok(size * textWidthEm(text) <= 335);
  // Largeur minuscule : le minimum
  assert.equal(fitFontSize(text, 92, 28, 40), 28);
  // Pas encore mesuré : la taille voulue
  assert.equal(fitFontSize(text, 92, 28, 0), 92);
});

// ---------------------------------------------------------------------------
// Révélation
// ---------------------------------------------------------------------------
test('révélation : verdict selon l’écart, avec l’écart en clair quand on était tout près', () => {
  assert.deepEqual(estimateVerdict(820, 820, '€'), { text: 'Pile dans le mille', close: true, direction: 'exact' });
  const near = estimateVerdict(850, 820, '€');
  assert.equal(near.text, `Tout près : tu étais à 30${NBSP}€`);
  assert.equal(near.close, true);
  assert.equal(estimateVerdict(700, 820, '€').text, 'Un peu plus que tu pensais');
  assert.equal(estimateVerdict(300, 820, '€').text, 'Bien plus que tu pensais');
  assert.equal(estimateVerdict(1000, 820, '€').text, 'Un peu moins que tu pensais');
  assert.equal(estimateVerdict(60000, 16500, 'dollars').text, 'Bien moins que tu pensais');
  assert.equal(estimateVerdict(60000, 16500, 'dollars').close, false);
});

test('révélation : chaque chiffre une seule fois, la ligne d’hypothèse reste', () => {
  const screen = reveal('epargner');
  assert.deepEqual(screen.start, { label: 'Au départ', value: 1000 });
  // Départ 1 000, estimation 850, vrai 820 : seules restent les lignes nouvelles
  const kept = revealExtraLines(screen.lines, [screen.value, 850, 1000]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].dim, true);

  const salary = reveal('decouvrir');
  const salaryKept = revealExtraLines(salary.lines, [salary.value, 2000, salary.start!.value]);
  assert.deepEqual(
    salaryKept.map((l) => l.value),
    [470, 2130, 925]
  );
});

test('révélation : la valeur de départ est facultative', () => {
  const screen = normalizeScreen({ type: 'reveal', payload: { value: 410, unit: '€' } }, 0) as LessonScreen;
  assert.equal(screen.kind, 'reveal');
  assert.equal(screen.kind === 'reveal' && screen.start, null);
  assert.equal(reveal('impots').start, null);
});

// ---------------------------------------------------------------------------
// Bouton principal
// ---------------------------------------------------------------------------
test('pari : « Je parie », inactif tant que le curseur n’a pas bougé', () => {
  const pari = discoveryLesson('epargner').screens[0];
  assert.equal(pari.kind, 'slider');
  assert.equal(primaryLabel(pari), 'Je parie');
  assert.equal(canContinue(pari, false), false);
  assert.equal(canContinue(pari, true), true);
  const choice = discoveryLesson('epargner').screens.find((s) => s.kind === 'choice');
  assert.equal(primaryLabel(choice), 'Valider');
  assert.equal(primaryLabel(reveal('epargner')), 'Continuer');
});
