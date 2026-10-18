/// <reference types="node" />
// Lancer : npm test
// Budget, mode Détaillé (lot 2) : dépenses notées le jour d'un relevé, courbe
// du mois réelle puis projetée, enveloppes et alerte douce.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { entriesAfter, spendable } from '../src/utils/budget/calc';
import { envelopeNotice, envelopeOverTwice, envelopes, spentByCategory } from '../src/utils/budget/envelopes';
import type { BudgetCategory, Entry, Recurring } from '../src/utils/budget/model';
import { dailyPace, monthCurve } from '../src/utils/budget/projection';

const RECURRING: Recurring[] = [
  { id: 1, type: 'revenu', category: null, label: 'Paie', amount: 1800, day: 31 },
  { id: 2, type: 'depense', category: 'Loyer', label: 'Loyer', amount: 600, day: 5 },
  { id: 3, type: 'depense', category: 'Abonnements', label: 'Abonnements', amount: 100, day: 22 },
  { id: 4, type: 'epargne', category: null, label: 'Épargne', amount: 200, day: 31 },
];
const dep = (id: number, on: string, amount: number, category = 'Courses'): Entry => ({ id, type: 'depense', category, label: category, amount, on });

test('dépense du jour du relevé : comptée seulement si notée après lui (repère du téléphone)', () => {
  const entries = [dep(10, '2026-10-18', 30), dep(11, '2026-10-18', 20)];
  // Sans repère : celles du jour du relevé sont dans le solde
  assert.equal(entriesAfter(entries, '2026-10-18', '2026-10-18').length, 0);
  // Relevé fait quand l'entrée 10 existait déjà : la 11 vient après
  assert.deepEqual(entriesAfter(entries, '2026-10-18', '2026-10-18', { on: '2026-10-18', maxEntryId: 10 }).map((e) => e.id), [11]);
  // Repère d'un autre jour : sans effet
  assert.equal(entriesAfter(entries, '2026-10-18', '2026-10-18', { on: '2026-10-17', maxEntryId: 0 }).length, 0);
  const s = spendable({ recurring: RECURRING, balances: [{ amount: 1000, on: '2026-10-18' }], today: '2026-10-18', entries, mark: { on: '2026-10-18', maxEntryId: 10 } })!;
  assert.equal(s.spent, 20);
  assert.equal(s.amount, 1000 - 100 - 20);
});

test('courbe du mois : réelle jusqu’à aujourd’hui, projetée ensuite avec le rythme de dépenses', () => {
  const entries = [dep(10, '2026-10-02', 40), dep(11, '2026-10-10', 50)];
  const c = monthCurve({ recurring: RECURRING, balances: [{ amount: 1500, on: '2026-09-30' }, { amount: 800, on: '2026-10-12' }], entries, today: '2026-10-18' })!;
  assert.equal(c.points[0].day, '2026-10-01');
  assert.equal(c.points[0].value, 1500);
  // Le 2 : 40 € de courses ; le 5 : le loyer
  assert.equal(c.points.find((p) => p.day === '2026-10-02')!.value, 1460);
  assert.equal(c.points.find((p) => p.day === '2026-10-05')!.value, 860);
  // Le relevé du 12 remet la courbe sur le vrai solde
  assert.equal(c.points.find((p) => p.day === '2026-10-12')!.value, 800);
  const todayPoint = c.points.find((p) => p.day === '2026-10-18')!;
  assert.equal(todayPoint.projected, false);
  assert.ok(c.points.filter((p) => p.day > '2026-10-18').every((p) => p.projected));
  assert.equal(c.points.at(-1)!.day, '2026-10-31');
  // Rythme : 90 € en 18 jours = 5 € par jour ; le 22 les abonnements ; le 31 paie et épargne
  assert.equal(dailyPace(entries, '2026-10-18'), 5);
  // Fin de mois : avant la paie du 31 (la courbe, elle, montre son arrivée)
  assert.equal(c.end, Math.round((800 - 13 * 5 - 100) * 100) / 100);
  assert.equal(c.points.at(-1)!.value, Math.round((800 - 13 * 5 - 100 + 1800 - 200) * 100) / 100);
  // Sans relevé : pas de courbe
  assert.equal(monthCurve({ recurring: RECURRING, balances: [], entries, today: '2026-10-18' }), null);
});

test('courbe du mois : premier relevé au milieu du mois, la courbe part de lui', () => {
  const c = monthCurve({ recurring: RECURRING, balances: [{ amount: 900, on: '2026-10-15' }], entries: [], today: '2026-10-18' })!;
  assert.equal(c.points[0].day, '2026-10-15');
  assert.equal(c.points[0].value, 900);
});

const CATS: BudgetCategory[] = [
  { id: 1, name: 'Courses', color: '#B9915B', family: 'besoins', envelopeCap: 300 },
  { id: 2, name: 'Sorties', color: '#B57BA0', family: 'envies', envelopeCap: 150 },
  { id: 3, name: 'Shopping', color: '#C99A5C', family: 'envies', envelopeCap: null },
];

test('enveloppes : dépensé sur le plafond, jauge rouge au-delà, alerte à 80 %', () => {
  const entries = [dep(1, '2026-10-03', 160), dep(2, '2026-10-05', 78, 'Sorties'), dep(3, '2026-10-06', 90, 'Sorties'), dep(4, '2026-09-28', 999), dep(5, '2026-10-07', 40, 'Shopping')];
  assert.deepEqual(spentByCategory(entries, '2026-10'), { Courses: 160, Sorties: 168, Shopping: 40 });
  const list = envelopes(CATS, entries, '2026-10', 80);
  assert.deepEqual(list.map((e) => [e.category, e.spent, e.over, e.alert]), [
    ['Courses', 160, false, false],
    ['Sorties', 168, true, true],
  ]);
  // Seuil réglable
  assert.equal(envelopes(CATS, entries, '2026-10', 50).find((e) => e.category === 'Courses')!.alert, true);
});

test('alerte douce : seulement quand une dépense franchit le seuil ou le plafond', () => {
  const before = envelopes(CATS, [dep(1, '2026-10-03', 230)], '2026-10', 80);
  const after = envelopes(CATS, [dep(1, '2026-10-03', 230), dep(2, '2026-10-04', 20)], '2026-10', 80);
  assert.match(envelopeNotice(before, after)!, /83 % de ton enveloppe Courses/);
  assert.equal(envelopeNotice(after, after), null, 'déjà prévenu : rien de plus');
  const over = envelopes(CATS, [dep(1, '2026-10-03', 310)], '2026-10', 80);
  assert.match(envelopeNotice(after, over)!, /dépassée/);
  assert.doesNotMatch(envelopeNotice(after, over)!, /tu devrais|trop/i);
});

test('enveloppe dépassée deux mois de suite (remarque de Val)', () => {
  const entries = [dep(1, '2026-08-03', 200, 'Sorties'), dep(2, '2026-09-04', 160, 'Sorties'), dep(3, '2026-09-05', 100)];
  assert.equal(envelopeOverTwice(CATS, entries, ['2026-08', '2026-09']), 'Sorties');
  assert.equal(envelopeOverTwice(CATS, entries, ['2026-09', '2026-10']), null);
});
