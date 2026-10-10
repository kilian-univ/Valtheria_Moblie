/// <reference types="node" />
// Lancer : npm test
// Correction locale des écrans interactifs (lesson/interactive.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeFormula } from '../src/lesson/formulas';
import {
  allocationMax,
  fillTemplate,
  gradeAllocation,
  initialAllocation,
  matchPassed,
  moveAllocation,
  moveItem,
  orderCorrect,
  orderResults,
  rangeLine,
  trueFalsePassed,
  trueFalseResults,
  trueFalseScore,
} from '../src/lesson/interactive';
import type { AllocateScreen } from '../src/lesson/model';
import { normalizeScreen } from '../src/lesson/normalize';
import { grade } from '../src/utils/grade';
import { canContinue, isGradable, validateHint } from '../src/utils/lessonPlayer';

// ---------------------------------------------------------------------------
// Vrai ou faux
// ---------------------------------------------------------------------------
test('vrai ou faux : verdict par carte, réussi à partir de 3 sur 4', () => {
  const screen = {
    pass: 3,
    cards: [true, false, false, true].map((answer, i) => ({ id: `c${i}`, statement: 's', answer, explanation: null })),
  };
  assert.deepEqual(trueFalseResults(screen, [true, false, true, true]), [true, true, false, true]);
  assert.equal(trueFalseScore(screen, [true, false, false, true]), 4);
  assert.equal(trueFalsePassed(screen, [true, false, false, true]), true);
  assert.equal(trueFalsePassed(screen, [true, false, true, true]), true); // 3 sur 4
  assert.equal(trueFalsePassed(screen, [false, true, false, true]), false); // 2 sur 4
  // Toutes les cartes doivent être jouées
  assert.equal(trueFalsePassed(screen, [true, false, false]), false);
});

// ---------------------------------------------------------------------------
// Remettre dans l'ordre
// ---------------------------------------------------------------------------
test('ordre : chaque élément vert ou rouge, juste seulement si tout est à sa place', () => {
  const screen = { items: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id })) };
  assert.deepEqual(orderResults(screen, ['a', 'c', 'b', 'd']), [true, false, false, true]);
  assert.equal(orderCorrect(screen, ['a', 'c', 'b', 'd']), false);
  assert.equal(orderCorrect(screen, ['a', 'b', 'c', 'd']), true);
  assert.equal(orderCorrect(screen, ['a', 'b', 'c']), false);
});

test('ordre : glisser, monter et descendre déplacent sans rien perdre', () => {
  const list = ['a', 'b', 'c', 'd'];
  assert.deepEqual(moveItem(list, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(list, 3, 0), ['d', 'a', 'b', 'c']);
  // Au-delà des bords : collé au bord ; sur place : même liste
  assert.deepEqual(moveItem(list, 1, 99), ['a', 'c', 'd', 'b']);
  assert.deepEqual(moveItem(list, 1, -5), ['b', 'a', 'c', 'd']);
  assert.equal(moveItem(list, 0, -1), list);
  assert.equal(moveItem(list, 5, 0), list);
});

// ---------------------------------------------------------------------------
// Associer
// ---------------------------------------------------------------------------
test('associer : réussi avec au plus une erreur, une fois toutes les paires trouvées', () => {
  const screen = { pairs: [1, 2, 3, 4].map((n) => ({ id: `${n}`, left: '', right: '' })), maxErrors: 1 };
  assert.equal(matchPassed(screen, 4, 0), true);
  assert.equal(matchPassed(screen, 4, 1), true);
  assert.equal(matchPassed(screen, 4, 2), false);
  assert.equal(matchPassed(screen, 3, 0), false);
});

// ---------------------------------------------------------------------------
// Répartir
// ---------------------------------------------------------------------------
const PAIE = normalizeScreen(
  {
    type: 'allocate',
    scored: true,
    payload: {
      total: 1800,
      step: 10,
      buckets: [
        { key: 'besoins', label: 'Besoins', start: 1260 },
        { key: 'envies', label: 'Envies', start: 540, reservoir: true },
        { key: 'epargne', label: 'Épargne', start: 0, live: 'Dans un an : {epargne*12} €' },
      ],
      rules: [
        { bucket: 'epargne', min: 180, val: { line: 'Épargne trop basse', mood: 'rassurant' } },
        { bucket: 'besoins', min: 900, val: { line: 'Besoins trop bas', mood: 'rassurant' } },
      ],
    },
  },
  0
) as AllocateScreen;

const sum = (v: Record<string, number>) => Object.values(v).reduce((a, b) => a + b, 0);

test('répartir : le réservoir absorbe les changements, le total ne bouge pas', () => {
  assert.equal(PAIE.kind, 'allocate');
  let v = initialAllocation(PAIE.buckets);
  v = moveAllocation(PAIE, v, 'epargne', 200);
  assert.deepEqual(v, { besoins: 1260, envies: 340, epargne: 200 });
  v = moveAllocation(PAIE, v, 'besoins', 1000);
  assert.deepEqual(v, { besoins: 1000, envies: 600, epargne: 200 });
  assert.equal(sum(v), 1800);
  // Valeur arrondie au pas
  v = moveAllocation(PAIE, v, 'epargne', 233);
  assert.equal(v.epargne, 230);
  // Le réservoir ne se règle pas directement
  assert.equal(moveAllocation(PAIE, v, 'envies', 0), v);
});

test('répartir : le réservoir ne passe jamais sous zéro', () => {
  let v = initialAllocation(PAIE.buckets);
  // Plus que ce que le réservoir peut céder : plafonné
  assert.equal(allocationMax(PAIE, v, 'epargne'), 540);
  v = moveAllocation(PAIE, v, 'epargne', 1800);
  assert.deepEqual(v, { besoins: 1260, envies: 0, epargne: 540 });
  v = moveAllocation(PAIE, v, 'besoins', 1800);
  assert.equal(v.besoins, 1260);
  // Jamais négatif, ni le pot ni le réservoir, total intact
  v = moveAllocation(PAIE, v, 'epargne', -50);
  assert.deepEqual(v, { besoins: 1260, envies: 540, epargne: 0 });
  // Mouvements au hasard : invariants tenus
  for (let i = 0; i < 500; i++) {
    const key = i % 2 ? 'epargne' : 'besoins';
    v = moveAllocation(PAIE, v, key, Math.round(Math.sin(i) * 2500));
    assert.ok(Object.values(v).every((x) => x >= 0), JSON.stringify(v));
    assert.equal(sum(v), 1800);
  }
});

test('répartir : règle du document et réplique de Val du cas', () => {
  const start = initialAllocation(PAIE.buckets);
  assert.equal(gradeAllocation(PAIE, start).failed?.val?.line, 'Épargne trop basse');
  assert.equal(gradeAllocation(PAIE, { besoins: 1260, envies: 360, epargne: 180 }).passed, true);
  assert.equal(gradeAllocation(PAIE, { besoins: 1260, envies: 370, epargne: 170 }).passed, false);
  const lowNeeds = gradeAllocation(PAIE, { besoins: 890, envies: 610, epargne: 300 });
  assert.equal(lowNeeds.passed, false);
  assert.equal(lowNeeds.failed?.val?.line, 'Besoins trop bas');
  assert.equal(gradeAllocation(PAIE, { besoins: 900, envies: 720, epargne: 180 }).passed, true);
});

test('répartir : texte en direct sous un pot', () => {
  const format = (n: number) => String(n);
  assert.equal(fillTemplate('Dans un an : {epargne*12} €', { epargne: 180 }, format), 'Dans un an : 2160 €');
  assert.equal(
    fillTemplate('{epargne} € par mois, c’est {epargne*12} € dans un an', { epargne: 200 }, format),
    '200 € par mois, c’est 2400 € dans un an'
  );
  // Pot inconnu : laissé tel quel
  assert.equal(fillTemplate('{autre}', { epargne: 1 }, format), '{autre}');
});

// ---------------------------------------------------------------------------
// Simulateur
// ---------------------------------------------------------------------------
test('simulateur : formules et plages de Val', () => {
  assert.deepEqual(computeFormula('inconnue', 1, {}), {});
  // Sans intérêt : la somme des versements
  assert.equal(computeFormula('savings_from_age', 60, { monthly: 100, rate: 0, end_age: 65 }).capital, 6000);
  assert.equal(Math.round(computeFormula('loan_over_years', 10, { capital: 12000, rate: 0 }).monthly), 100);
  const ranges = [
    { min: null, max: 29, val: { line: 'tôt', mood: 'complice' as const } },
    { min: 30, max: null, val: { line: 'tard', mood: 'complice' as const } },
  ];
  assert.equal(rangeLine(ranges, 25)?.line, 'tôt');
  assert.equal(rangeLine(ranges, 30)?.line, 'tard');
  assert.equal(rangeLine([], 30), null);
});

// ---------------------------------------------------------------------------
// Dialogue (corrigé comme sur le site) et lecteur
// ---------------------------------------------------------------------------
test('dialogue : la réplique juste, selon grade.ts', () => {
  const source = {
    type: 'dialogue',
    scored: true,
    payload: { replies: [{ id: 'a' }, { id: 'b', correct: true }, { id: 'c' }] },
  };
  assert.equal(grade(source, 'b'), true);
  assert.equal(grade(source, 'a'), false);
});

test('lecteur : nouveaux types notés validés, simulateur bloqué tant que le curseur n’a pas bougé', () => {
  const screen = (type: string, scored: boolean, payload: unknown) => normalizeScreen({ type, scored, payload }, 0);
  const tf = screen('true_false', true, { cards: [{ statement: 's', answer: true }] });
  const sim = screen('simulator', false, {
    min: 1,
    max: 2,
    formula: 'loan_over_years',
    outputs: [{ key: 'monthly', label: 'Mensualité' }],
  });
  assert.equal(tf.kind, 'true_false');
  assert.equal(sim.kind, 'simulator');
  assert.equal(isGradable(tf), true);
  assert.equal(isGradable(sim), false);
  assert.equal(canContinue(sim, false), false);
  assert.equal(canContinue(sim, true), true);
  assert.equal(canContinue(tf, false), true);
  assert.equal(validateHint(tf), 'Réponds à toutes les cartes.');
});
