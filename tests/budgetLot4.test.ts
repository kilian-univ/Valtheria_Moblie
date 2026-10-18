/// <reference types="node" />
// Lancer : npm test
// Budget, lot 4 : étapes et mois dans le vert, dépenses du budget pour
// l'épargne de précaution, épargne qui compte pour la régularité du
// patrimoine, remarques de Val reliées aux mois réels.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { greenMonths } from '../src/utils/budget/review';
import { bestGreenRun, budgetSatisfied, currentGreenRun, earnBudget, greenRunLabel } from '../src/utils/budget/milestones';
import type { Budget, BudgetCategory, Entry, Recurring } from '../src/utils/budget/model';
import { budgetExpenses, savingMonths } from '../src/utils/budget/patrimoine';
import { chooseBudgetTip, FORBIDDEN_TONE } from '../src/utils/budget/tips';
import { emergencyGauge } from '../src/utils/patrimoine/goals';
import { currentStreak } from '../src/utils/patrimoine/regularity';

const RECURRING: Recurring[] = [
  { id: 1, type: 'revenu', category: null, label: 'Paie', amount: 1800, day: 31 },
  { id: 2, type: 'depense', category: 'Loyer', label: 'Loyer', amount: 600, day: 5 },
  { id: 3, type: 'depense', category: 'Abonnements', label: 'Abonnements', amount: 100, day: 22 },
  { id: 4, type: 'epargne', category: null, label: 'Livret A', amount: 200, day: 31 },
];
const CATEGORIES: BudgetCategory[] = [
  { id: 1, name: 'Loyer', color: '#C97F63', family: 'besoins', envelopeCap: null },
  { id: 2, name: 'Abonnements', color: '#6FA896', family: 'envies', envelopeCap: null },
  { id: 3, name: 'Courses', color: '#7C9CC4', family: 'besoins', envelopeCap: 300 },
];
const TODAY = '2026-10-18';
const budget = (balances: { amount: number; on: string }[], entries: Entry[] = [], mode: 'essentiel' | 'detaille' = 'essentiel'): Budget => ({
  today: TODAY,
  settings: { mode, setupDone: true, envelopeAlertPct: 80 },
  categories: CATEGORIES,
  recurring: RECURRING,
  entries,
  balances,
  reviews: [],
  legacy: [],
});
// Chaque mois : 1 800 de paie, 700 de charges, 200 d'épargne. Le solde de fin
// de mois donne les dépenses courantes : solde d'avant + 900 − solde de fin.
const GREEN_RUN = [
  { amount: 1000, on: '2026-06-30' },
  { amount: 1400, on: '2026-07-31' }, // juillet : 500 de courantes, restant 400
  { amount: 1800, on: '2026-08-31' }, // août : 500
  { amount: 2100, on: '2026-09-30' }, // septembre : 600, restant 300
];

test('mois dans le vert d’affilée et étapes, calculés en mode Essentiel avec les soldes', () => {
  const b = budget(GREEN_RUN);
  assert.equal(currentGreenRun(b, TODAY), 3);
  assert.equal(bestGreenRun(b, TODAY), 3);
  assert.equal(greenRunLabel(3), '3 mois dans le vert d’affilée');
  assert.equal(greenRunLabel(1), '1 mois dans le vert');
  assert.equal(greenRunLabel(0), null);
  const keys = budgetSatisfied(b, TODAY);
  // Taux d'épargne de juillet : (1 800 − 700 − 500) / 1 800 = 33 %
  assert.deepEqual(keys, ['premier_mois', 'trois_verts', 'epargne_10', 'epargne_20']);
});

test('étapes : un mois qui dépasse casse la série, jamais d’étape liée au montant dépensé', () => {
  const b = budget([...GREEN_RUN.slice(0, 3), { amount: 600, on: '2026-09-30' }]);
  // Septembre : 1 800 + 900 − 600 = 2 100 de courantes, restant négatif
  assert.equal(currentGreenRun(b, TODAY), 0);
  assert.equal(bestGreenRun(b, TODAY), 2);
  assert.ok(!budgetSatisfied(b, TODAY).includes('trois_verts'));
  // Un seul relevé : rien n'est encore gagné
  assert.deepEqual(budgetSatisfied(budget([{ amount: 1000, on: '2026-10-02' }]), TODAY), []);
});

test('étapes : première enveloppe tenue (mode Détaillé), gagnée une fois et gardée', () => {
  const entries: Entry[] = [{ id: 1, type: 'depense', category: 'Courses', label: 'Courses', amount: 240, on: '2026-09-12' }];
  const b = budget([{ amount: 1000, on: '2026-08-31' }], entries, 'detaille');
  assert.ok(budgetSatisfied(b, TODAY).includes('premiere_enveloppe'));
  // Enveloppe dépassée : pas tenue
  const over = budget([{ amount: 1000, on: '2026-08-31' }], [{ ...entries[0], amount: 320 }], 'detaille');
  assert.ok(!budgetSatisfied(over, TODAY).includes('premiere_enveloppe'));
  const first = earnBudget({}, b, TODAY, '2026-10-01T00:00:00Z');
  assert.ok(first.fresh.includes('premiere_enveloppe'));
  // Deuxième passage : rien de neuf, la date est gardée ; une étape ne se perd pas
  const again = earnBudget(first.earned, over, TODAY, '2026-11-01T00:00:00Z');
  assert.deepEqual(again.fresh, []);
  assert.equal(again.earned.premiere_enveloppe, '2026-10-01T00:00:00Z');
});

test('épargne de précaution : charges fixes et moyenne des dépenses courantes du budget', () => {
  const b = budget(GREEN_RUN);
  // Moyenne des trois derniers mois terminés : (500 + 500 + 600) / 3
  const e = budgetExpenses(b, TODAY)!;
  assert.equal(e.charges, 700);
  assert.equal(e.average, Math.round((1600 / 3) * 100) / 100);
  assert.equal(e.total, Math.round((700 + 1600 / 3) * 100) / 100);
  assert.equal(e.months, 3);
  // Jauge : trois mois de ces dépenses
  const gauge = emergencyGauge({ monthlyExpenses: e.total, months: 3 }, []);
  assert.equal(gauge!.target, e.total * 3);
  // Aucun mois terminé connu ou pas de mise en route : rien, la saisie reste possible
  assert.equal(budgetExpenses(budget([{ amount: 1000, on: '2026-10-02' }]), TODAY), null);
  assert.equal(budgetExpenses({ ...b, settings: { ...b.settings, setupDone: false } }, TODAY), null);
});

test('régularité du patrimoine : chaque mois d’épargne du budget compte', () => {
  const b = budget(GREEN_RUN);
  // Épargne le 31 : octobre ne compte pas encore le 18
  assert.deepEqual(savingMonths(b, TODAY), ['2026-06', '2026-07', '2026-08', '2026-09']);
  assert.deepEqual(savingMonths(b, '2026-10-31').at(-1), '2026-10');
  assert.equal(currentStreak(savingMonths(b, TODAY), new Date(2026, 9, 18)), 4);
  // Sans épargne prévue : rien
  assert.deepEqual(savingMonths({ ...b, recurring: RECURRING.filter((r) => r.type !== 'epargne') }, TODAY), []);
});

test('remarques de Val : reliées aux mois réels et à « Garder la main sur son argent »', () => {
  const over = budget([...GREEN_RUN.slice(0, 2), { amount: 300, on: '2026-08-31' }, { amount: 200, on: '2026-09-30' }]);
  const greens = greenMonths(over, TODAY, 'essentiel').map((g) => g.green);
  const tip = chooseBudgetTip({ income: 1800, subscriptions: 100, saving: 200, greenMonths: greens })!;
  assert.equal(tip.key, 'overspend');
  assert.equal(tip.link.universe, 'garder-la-main');
  assert.ok(!FORBIDDEN_TONE.test(tip.text));
  // Mois dans le vert : la remarque suivante (abonnements au-delà de 5 %)
  const calm = chooseBudgetTip({ income: 1800, subscriptions: 100, saving: 200, greenMonths: greenMonths(budget(GREEN_RUN), TODAY, 'essentiel').map((g) => g.green) })!;
  assert.equal(calm.key, 'subscriptions');
  // Enveloppe dépassée deux mois de suite : en premier
  assert.equal(chooseBudgetTip({ income: 1800, subscriptions: 0, saving: 400, greenMonths: greens, envelopeOverTwice: 'Courses' })!.key, 'envelope_over');
});
