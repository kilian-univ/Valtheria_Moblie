/// <reference types="node" />
// Lancer : npm test
// Lecteur de leçon : pastille d'affilée, grands chiffres, révélation, bouton
// principal, écrans interactifs (utils/lessonPlayer.ts, utils/fit.ts,
// lesson/formulas.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { discoveryLesson } from '../src/lesson/discovery';
import { computeFormula, formulaSeries, seriesScale } from '../src/lesson/formulas';
import { trueFalseReaction } from '../src/lesson/interactive';
import type { LessonScreen, RevealScreen } from '../src/lesson/model';
import { normalizeScreen } from '../src/lesson/normalize';
import { fitFontSize, textWidthEm } from '../src/utils/fit';
import {
  canContinue,
  estimateVerdict,
  hasPrimaryButton,
  primaryLabel,
  RUN_MIN,
  revealExtraLines,
  runBadge,
  showsVal,
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

// ---------------------------------------------------------------------------
// Lot 2 : vrai ou faux, ordre, associer, répartir, simulateur, dialogue
// ---------------------------------------------------------------------------
test('vrai ou faux, associer, dialogue : pas de bouton du bas ; Val absent du dialogue', () => {
  const kinds = (objective: Parameters<typeof discoveryLesson>[0]) => discoveryLesson(objective).screens;
  const all = [...kinds('epargner'), ...kinds('crypto'), ...kinds('investir')];
  for (const s of all) {
    const auto = s.kind === 'true_false' || s.kind === 'match' || s.kind === 'dialogue';
    assert.equal(hasPrimaryButton(s), !auto, s.kind);
    assert.equal(showsVal(s), s.kind !== 'dialogue', s.kind);
  }
});

test('vrai ou faux : une réaction courte de Val par carte, toujours la même', () => {
  assert.equal(trueFalseReaction(true, 0).mood, 'celebrant');
  assert.equal(trueFalseReaction(false, 1).mood, 'rassurant');
  assert.deepEqual(trueFalseReaction(true, 4), trueFalseReaction(true, 4));
});

test('ordre : libellés de l’axe lus dans les données, « Premier » et « Dernier » par défaut', () => {
  const placements = discoveryLesson('investir').screens.find((s) => s.kind === 'order');
  assert.ok(placements && placements.kind === 'order');
  assert.deepEqual(placements.axis, { start: 'Moins risqué', end: 'Plus risqué', risk: true });
  const plain = normalizeScreen({ type: 'order', payload: { items: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] } }, 0);
  assert.ok(plain.kind === 'order');
  assert.deepEqual(plain.axis, { start: 'Premier', end: 'Dernier', risk: false });
});

test('dialogue : la ligne de présentation des personnages', () => {
  const role = (objective: Parameters<typeof discoveryLesson>[0]) => {
    const s = discoveryLesson(objective).screens.find((x) => x.kind === 'dialogue');
    return s && s.kind === 'dialogue' ? s.character.role : null;
  };
  assert.equal(role('crypto'), 'ton pote, très enthousiaste');
  assert.equal(role('decouvrir'), 'ton collègue');
});

test('simulateur : la courbe va du départ au résultat affiché, échelle commune', () => {
  const params = { monthly: 100, rate: 0.05, end_age: 65 };
  const at30 = formulaSeries('savings_from_age', 30, params);
  assert.ok(at30);
  assert.equal(at30.main.length, 24);
  assert.equal(at30.main[0], 0);
  // Dernier point : le capital et le total versé du grand chiffre
  const result = computeFormula('savings_from_age', 30, params);
  assert.ok(Math.abs(at30.main[23] - result.capital) < 1e-6);
  assert.ok(Math.abs(at30.base[23] - result.paid) < 1e-6);
  // L'argent grossit plus vite que les versements
  assert.ok(at30.main.every((v, i) => v >= at30.base[i] - 1e-6));
  assert.equal(at30.from, '30 ans');
  assert.equal(at30.to, '65 ans');
  // Échelle : la plus grande valeur sur toute la plage (départ à 20 ans)
  const scale = seriesScale('savings_from_age', 20, 50, params);
  assert.ok(Math.abs(scale - computeFormula('savings_from_age', 20, params).capital) < 1e-6);

  // Logement : intérêts cumulés selon la durée
  const loan = formulaSeries('loan_over_years', 25, { capital: 200000, rate: 0.035 });
  assert.ok(loan);
  assert.equal(loan.main[0], 0);
  assert.ok(Math.abs(loan.main[23] - computeFormula('loan_over_years', 25, { capital: 200000, rate: 0.035 }).interest) < 1);
  assert.ok(Math.abs(loan.base[23] - 200000) < 1);
  assert.equal(formulaSeries('inconnue', 1, {}), null);
});

test('simulateur : phrase sous le grand chiffre', () => {
  const sim = discoveryLesson('investir').screens.find((s) => s.kind === 'simulator');
  assert.ok(sim && sim.kind === 'simulator');
  assert.equal(sim.outputs.find((o) => o.key === 'paid')?.caption, 'dont {} versés');
  assert.equal(sim.outputs.find((o) => o.key === 'capital')?.caption, null);
});
