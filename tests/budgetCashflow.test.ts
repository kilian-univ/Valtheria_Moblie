/// <reference types="node" />
// Lancer : npm test
// Budget, cash-flow et bilan (lot 3) : dépenses courantes déduites des soldes,
// taux d'épargne, périodes, comparaison à la moyenne, mois dans le vert.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { changeLabel, compareToAverage, courantesByMonth, familyTotals, monthFlow, periodFlow, periodMonths, rateSeries, shiftPeriod } from '../src/utils/budget/flows';
import type { Balance, BudgetCategory, Entry, Recurring } from '../src/utils/budget/model';
import { greenMonths, greenStreak, monthReview, reviewToPropose } from '../src/utils/budget/review';

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
  { id: 4, name: 'Sorties', color: '#C9855A', family: 'envies', envelopeCap: null },
];
const ctx = (balances: Balance[], entries: Entry[] = []) => ({ recurring: RECURRING, categories: CATEGORIES, balances, entries });
const dep = (id: number, on: string, amount: number, category = 'Courses'): Entry => ({ id, type: 'depense', category, label: category, amount, on });
const TODAY = '2026-10-18';

test('dépenses courantes déduites des soldes : solde + rentrées − charges − épargne − solde suivant', () => {
  // Du 31 août (après la paie) au 30 septembre (la paie du 31 tombe le 30) :
  // 1 000 + 1 800 − 600 − 100 − 200 − 1 500 = 400
  const m = courantesByMonth(ctx([{ amount: 1000, on: '2026-08-31' }, { amount: 1500, on: '2026-09-30' }]));
  assert.equal(Math.round(m.get('2026-09')!.amount), 400);
  assert.equal(m.get('2026-09')!.days, 30);
});

test('dépenses courantes : un écart entre deux relevés est réparti jour par jour sur les mois', () => {
  // Du 20 août au 9 septembre (20 jours : 11 en août, 9 en septembre)
  // 1 000 + 1 800 − 200 − 100 (abonnements du 22) − 600 (loyer du 5) − 1 500 = 400
  const m = courantesByMonth(ctx([{ amount: 1000, on: '2026-08-20' }, { amount: 1500, on: '2026-09-09' }]));
  assert.equal(Math.round(m.get('2026-08')!.amount), 220);
  assert.equal(Math.round(m.get('2026-09')!.amount), 180);
  // Un solde qui monte sans rentrée connue : jamais de dépenses négatives
  const up = courantesByMonth(ctx([{ amount: 1000, on: '2026-09-10' }, { amount: 1300, on: '2026-09-12' }]));
  assert.equal(up.get('2026-09')!.amount, 0);
});

test('mois Essentiel : rentrées, charges fixes, bande « Dépenses courantes », épargne et taux', () => {
  const f = monthFlow(ctx([{ amount: 1000, on: '2026-08-31' }, { amount: 1500, on: '2026-09-30' }]), '2026-09', TODAY, 'essentiel');
  assert.equal(f.hasData, true);
  assert.equal(f.income, 1800);
  assert.equal(f.charges, 700);
  assert.equal(f.variable, 400);
  assert.equal(f.spent, 1100);
  assert.equal(f.saved, 700);
  assert.equal(f.rest, 500);
  assert.equal(Math.round(f.rate! * 100), 39);
  assert.deepEqual(
    f.postes.map((p) => [p.label, p.family, p.amount]),
    [
      ['Loyer', 'besoins', 600],
      ['Abonnements', 'envies', 100],
      ['Dépenses courantes', 'courantes', 400],
      ['Livret A', 'epargne', 200],
      ['Resté sur le compte', 'epargne', 500],
    ]
  );
  assert.deepEqual(
    familyTotals(f.postes).map((x) => [x.family, x.amount]),
    [
      ['besoins', 600],
      ['envies', 100],
      ['courantes', 400],
      ['epargne', 700],
    ]
  );
  // Avant le premier relevé : rien
  assert.equal(monthFlow(ctx([{ amount: 1000, on: '2026-08-31' }]), '2026-07', TODAY, 'essentiel').hasData, false);
});

test('mois Essentiel en partie couvert : estimé au-delà de 7 jours, inconnu en deçà', () => {
  // Premier relevé le 15 septembre : 15 jours couverts, 150 € → 300 € sur le mois
  const part = monthFlow(ctx([{ amount: 1000, on: '2026-09-15' }, { amount: 2350, on: '2026-09-30' }]), '2026-09', TODAY, 'essentiel');
  assert.equal(part.estimated, true);
  assert.equal(part.variable, 300);
  const few = monthFlow(ctx([{ amount: 1000, on: '2026-09-28' }, { amount: 2390, on: '2026-09-30' }]), '2026-09', TODAY, 'essentiel');
  assert.equal(few.variable, null);
  assert.equal(few.rate, null);
  // Mois en cours : ce qui est connu jusqu'au dernier relevé, sans estimation
  const cur = monthFlow(ctx([{ amount: 1500, on: '2026-09-30' }, { amount: 800, on: '2026-10-10' }]), '2026-10', TODAY, 'essentiel');
  assert.equal(cur.current, true);
  assert.equal(cur.variable, 100);
  assert.equal(cur.until, '2026-10-10');
  assert.equal(cur.estimated, false);
});

test('mois Détaillé : dépenses notées par catégorie, avec les charges de même catégorie', () => {
  const entries = [dep(10, '2026-10-02', 40), dep(11, '2026-10-12', 60), dep(12, '2026-10-03', 30, 'Sorties'), dep(13, '2026-09-30', 99)];
  const f = monthFlow(ctx([{ amount: 1500, on: '2026-09-30' }], entries), '2026-10', TODAY, 'detaille');
  assert.equal(f.variable, 130);
  assert.equal(f.spent, 830);
  const courses = f.postes.find((p) => p.label === 'Courses')!;
  assert.equal(courses.amount, 100);
  assert.equal(courses.family, 'besoins');
  assert.equal(f.postes.find((p) => p.label === 'Sorties')!.family, 'envies');
  assert.equal(f.postes.some((p) => p.family === 'courantes'), false);
});

test('taux d’épargne négatif quand les dépenses dépassent les rentrées', () => {
  // 1 000 + 1 800 − 900 − 1 200 = 700 de courantes ; 700 + 700 > 1 800 − 200
  const f = monthFlow(ctx([{ amount: 1000, on: '2026-08-31' }, { amount: 0, on: '2026-09-30' }]), '2026-09', TODAY, 'essentiel');
  assert.equal(f.variable, 1900);
  assert.equal(f.saved, -800);
  assert.ok(f.rate! < 0);
  // L'épargne prévue reste un poste ; pas de « Resté sur le compte »
  assert.equal(f.postes.some((p) => p.key === 'rest'), false);
  const series = rateSeries(ctx([{ amount: 1000, on: '2026-08-31' }, { amount: 0, on: '2026-09-30' }]), '2026-10', TODAY, 'essentiel');
  assert.equal(series.length, 6);
  assert.equal(series[0].month, '2026-05');
  assert.equal(series[0].rate, null);
  assert.ok(series[4].rate! < 0);
});

test('périodes : trimestre et année jusqu’au mois en cours, navigation', () => {
  assert.deepEqual(periodMonths('2026-10', 'trimestre', TODAY), ['2026-10']);
  assert.deepEqual(periodMonths('2026-08', 'trimestre', TODAY), ['2026-07', '2026-08', '2026-09']);
  assert.equal(periodMonths('2026-03', 'annee', TODAY).length, 10);
  assert.equal(shiftPeriod('2026-10', 'trimestre', -1), '2026-07');
  assert.equal(shiftPeriod('2026-10', 'annee', -1), '2025-10');
  const balances = [
    { amount: 1000, on: '2026-07-31' },
    { amount: 1500, on: '2026-08-31' },
    { amount: 1500, on: '2026-09-30' },
  ];
  const q = periodFlow(ctx(balances), periodMonths('2026-08', 'trimestre', TODAY), TODAY, 'essentiel');
  // Juillet n'a qu'un jour couvert : il ne compte pas
  assert.deepEqual(q.counted, ['2026-08', '2026-09']);
  assert.equal(q.income, 3600);
});

test('catégories comparées à la moyenne : « = », hausse, baisse', () => {
  const entries = [dep(1, '2026-08-03', 100), dep(2, '2026-09-03', 100), dep(3, '2026-10-03', 110), dep(4, '2026-08-04', 50, 'Sorties'), dep(5, '2026-10-04', 40, 'Sorties')];
  const c = ctx([{ amount: 1000, on: '2026-08-01' }], entries);
  const flows = ['2026-10', '2026-09', '2026-08'].map((m) => periodFlow(c, [m], TODAY, 'detaille'));
  const rows = compareToAverage(flows[0], flows.slice(1));
  const by = (label: string) => rows.find((r) => r.label === label)!;
  assert.equal(rows[0].label, 'Loyer');
  assert.equal(changeLabel(by('Loyer').change), '=');
  assert.equal(changeLabel(by('Courses').change), '+ 10 %');
  // Sorties : 40 € contre une moyenne de 25 €
  assert.equal(by('Sorties').average, 25);
  assert.equal(changeLabel(-0.12), '− 12 %');
  assert.equal(changeLabel(null), null);
  // L'épargne n'est pas une catégorie de dépense
  assert.equal(rows.some((r) => r.family === 'epargne'), false);
});

test('mois dans le vert d’affilée, calculés aussi en mode Essentiel', () => {
  const balances = [
    { amount: 1000, on: '2026-06-30' },
    { amount: 1400, on: '2026-07-31' }, // juillet : 1 000 + 1 800 − 900 − 1 400 = 500 de courantes, restant 400 : vert
    { amount: 200, on: '2026-08-31' }, // août : 1 400 + 1 800 − 900 − 200 = 2 100, restant −1 200 : pas vert
    { amount: 600, on: '2026-09-30' }, // septembre : 200 + 1 800 − 900 − 600 = 500 : vert
  ];
  const g = greenMonths(ctx(balances), TODAY, 'essentiel');
  assert.deepEqual(
    g.map((x) => [x.month, x.green]),
    [
      ['2026-06', null],
      ['2026-07', true],
      ['2026-08', false],
      ['2026-09', true],
    ]
  );
  assert.equal(greenStreak(ctx(balances), '2026-09', TODAY, 'essentiel'), 1);
  assert.equal(greenStreak(ctx(balances), '2026-07', TODAY, 'essentiel'), 1);
  // Le mois en cours ne compte jamais
  assert.equal(greenStreak(ctx(balances), '2026-10', TODAY, 'essentiel'), 0);
});

test('bilan du mois : chiffres, écarts avec le mois d’avant, réponses gardées, proposé une fois', () => {
  const balances = [
    { amount: 1000, on: '2026-07-31' },
    { amount: 1600, on: '2026-08-31' },
    { amount: 1700, on: '2026-09-30' },
  ];
  const budget = { ...ctx(balances), reviews: [{ month: '2026-08', answer: 'moins_de_sorties' }] };
  const r = monthReview(budget, '2026-09', TODAY, 'essentiel')!;
  assert.equal(r.green, true);
  assert.equal(r.saved, 200);
  // Septembre : 1 600 + 1 800 − 900 − 1 700 = 800 de courantes, 700 de charges
  assert.equal(r.spent, 1500);
  assert.equal(r.rest, 100);
  assert.equal(r.streak, 2);
  assert.equal(r.nextName, 'octobre');
  assert.equal(r.previousAnswer, 'moins_de_sorties');
  assert.equal(r.answer, null);
  // Août : 1 000 + 1 800 − 900 − 1 600 = 300 de courantes → + 500 en septembre
  assert.deepEqual(
    r.rows.map((x) => [x.label, x.diff]),
    [
      ['Dépenses courantes', 500],
      ['Loyer', 0],
      ['Abonnements', 0],
    ]
  );
  assert.equal(monthReview(budget, '2026-10', TODAY, 'essentiel'), null);
  assert.equal(reviewToPropose(budget, TODAY, 'essentiel', []), '2026-09');
  assert.equal(reviewToPropose(budget, TODAY, 'essentiel', ['2026-09']), null);
  assert.equal(reviewToPropose({ ...budget, reviews: [{ month: '2026-09', answer: 'rien' }] }, TODAY, 'essentiel', []), null);
});
