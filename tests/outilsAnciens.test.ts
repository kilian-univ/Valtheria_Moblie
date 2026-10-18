/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { goalGauge, newlyReached } from '@/src/utils/patrimoine/goals';
import { earn } from '@/src/utils/patrimoine/milestones';
import type { Position } from '@/src/utils/patrimoine/model';
import { parsePrefs } from '@/src/utils/patrimoine/prefs';
import { importSavingsGoals, readSavingsGoals } from '@/src/utils/patrimoine/savingsImport';

const root = new URL('../', import.meta.url);

// L'ancien Cash-flow est remplacé par Mon budget (18/10/2026) : ses données
// sont reprises à la mise en route (tests/budget.test.ts, fromLegacy)
test('Ancien Cash-flow retiré : plus d’écran, de route ni de composants', () => {
  for (const f of ['app/outils/cashflow.tsx', 'src/screens/CashflowScreen.tsx', 'src/utils/cashflow.ts', 'src/components/outils/cashflow']) {
    assert.ok(!existsSync(new URL(f, root)), f);
  }
  assert.ok(!/name="cashflow"/.test(readFileSync(new URL('app/outils/_layout.tsx', root), 'utf8')));
  assert.ok(!readFileSync(new URL('src/screens/OutilsScreen.tsx', root), 'utf8').includes("'/outils/cashflow'"));
});

test('Épargne retirée : plus d’écran, de route ni de place dans Outils', () => {
  assert.ok(!existsSync(new URL('app/outils/epargne.tsx', root)));
  assert.ok(!existsSync(new URL('src/screens/EpargneScreen.tsx', root)));
  assert.ok(!readFileSync(new URL('app/outils/_layout.tsx', root), 'utf8').includes('epargne'));
  assert.ok(!readFileSync(new URL('src/screens/OutilsScreen.tsx', root), 'utf8').includes('/outils/epargne'));
  // Mon budget a remplacé Cash-flow dans Outils (18/10/2026)
  assert.ok(readFileSync(new URL('src/screens/OutilsScreen.tsx', root), 'utf8').includes('/outils/budget'));
});

test('Reprise des objectifs d’épargne : nom, montant et échéance du site', () => {
  const goals = readSavingsGoals({
    goals: [
      { id: 3, name: ' Voyage ', target_amount: 1500, target_date: '2027-06-30', current_amount: 200 },
      { id: 4, name: 'Vélo', target_amount: '800.50', target_date: null },
      { id: 5, name: '', target_amount: 100 },
      { id: 6, name: 'Sans montant', target_amount: 0 },
      null,
    ],
  });
  assert.deepEqual(goals, [
    { name: 'Voyage', amount: 1500, date: '2027-06-30' },
    { name: 'Vélo', amount: 800.5, date: null },
  ]);
  // Réponse sans liste : rien n'est noté repris
  assert.equal(readSavingsGoals({}), null);
  assert.equal(readSavingsGoals('Server Error'), null);
  assert.deepEqual(readSavingsGoals({ goals: [] }), []);
});

const position = (id: number, type: Position['type'], value: number, name: string): Position => ({
  id, ticker: name.toUpperCase(), name, type, logoUrl: null, risk: null, quantity: 1, currency: 'EUR',
  avgCost: value, currentPrice: value, invested: value, value, gain: 0, gainPct: 0, valueEur: value, investedEur: value,
  dailyChangePct: 0, isLive: true, priceSource: null, priceUpdatedAt: null, realizedGain: 0, realizedGainEur: 0,
  operationsCount: 1, openedAt: null, isLivret: type === 'livret', isManual: false, interestEur: null, interestRatePct: null,
  interestRateSource: null, interestRateEffectiveAt: null, interestRateVerifiedAt: null,
});
const PLACEMENTS = [position(1, 'livret', 1000, 'Livret A'), position(2, 'etf', 4000, 'MSCI World'), position(5, 'livret', 500, 'LDDS')];

test('Reprise des objectifs d’épargne : une seule fois, sans doublon', () => {
  const now = new Date('2026-10-17T10:00:00Z');
  const prefs = parsePrefs({ goals: [{ id: 'g1', name: 'Voyage', amount: 1500, date: '2027-06-30', createdAt: '2026-01-01T00:00:00Z' }] });
  assert.equal(prefs.savingsImported, false);
  const site = [
    { name: 'Voyage', amount: 1500, date: '2027-06-30' },
    { name: 'Vélo', amount: 8000, date: null },
    { name: 'Vélo', amount: 8000, date: null },
  ];
  const once = importSavingsGoals(prefs, site, PLACEMENTS, now);
  assert.equal(once.savingsImported, true);
  assert.deepEqual(once.goals.map((g) => [g.name, g.amount, g.date, g.reachedAt]), [
    ['Voyage', 1500, '2027-06-30', null],
    ['Vélo', 8000, null, null],
  ]);
  assert.equal(once.goals[1].createdAt, now.toISOString());
  // Deuxième passage (ou objectif supprimé ensuite) : rien n'est repris
  const deleted = { ...once, goals: once.goals.slice(0, 1) };
  assert.equal(importSavingsGoals(deleted, site, PLACEMENTS, now), deleted);
  // Le repère survit à la relecture du téléphone
  assert.equal(parsePrefs(JSON.parse(JSON.stringify(once))).savingsImported, true);
  // Liste vide côté site : repris quand même (plus de nouvel essai)
  assert.equal(importSavingsGoals(prefs, [], PLACEMENTS, now).savingsImported, true);
});

test('Reprise des objectifs d’épargne : reliés aux placements sans risque', () => {
  const next = importSavingsGoals(parsePrefs(null), [{ name: 'Voyage', amount: 12000, date: null }], PLACEMENTS, new Date());
  assert.deepEqual(next.goals[0].positionIds, [1, 5]);
  // Sans placement sans risque : rien de relié, l'objectif le dira
  const none = importSavingsGoals(parsePrefs(null), [{ name: 'Voyage', amount: 12000, date: null }], [PLACEMENTS[1]], new Date());
  assert.deepEqual(none.goals[0].positionIds, []);
  assert.equal(goalGauge(none.goals[0], [PLACEMENTS[1]]), null);
});

test('Reprise des objectifs d’épargne : déjà dépassés, notés atteints sans célébration', () => {
  const now = new Date('2026-10-17T10:00:00Z');
  // Livret A + LDDS = 1 500 € : « Vélo » (800 €) est dépassé, pas « Voyage »
  const site = [{ name: 'Vélo', amount: 800, date: null }, { name: 'Voyage', amount: 12000, date: null }];
  const next = importSavingsGoals(parsePrefs(null), site, PLACEMENTS, now);
  assert.deepEqual(next.goals.map((g) => [g.name, g.reachedAt]), [['Vélo', now.toISOString()], ['Voyage', null]]);
  // Rien à fêter à l'ouverture suivante : ni objectif, ni étape
  assert.deepEqual(newlyReached(next.goals, PLACEMENTS), []);
  assert.equal(next.milestones.premier_objectif, now.toISOString());
  const ctx = { positions: PLACEMENTS, bestStreak: 0, emergencyReached: false, anyGoalReached: next.goals.some((g) => g.reachedAt) };
  assert.ok(!earn(next.milestones, ctx, now.toISOString()).fresh.includes('premier_objectif'));
  // Étape déjà gagnée avant : sa date est gardée
  const earned = { ...parsePrefs(null), milestones: { premier_objectif: '2026-01-01T00:00:00.000Z' } };
  assert.equal(importSavingsGoals(earned, site, PLACEMENTS, now).milestones.premier_objectif, '2026-01-01T00:00:00.000Z');
  // Aucun objectif dépassé : l'étape reste à gagner
  assert.equal(importSavingsGoals(parsePrefs(null), site.slice(1), PLACEMENTS, now).milestones.premier_objectif, undefined);
});

test('Reprise des objectifs d’épargne : dans la limite de 20 objectifs', () => {
  const full = parsePrefs({ goals: Array.from({ length: 19 }, (_, i) => ({ id: `g${i}`, name: `O${i}`, amount: 10 })) });
  const next = importSavingsGoals(full, [{ name: 'A', amount: 1, date: null }, { name: 'B', amount: 2, date: null }], PLACEMENTS, new Date());
  assert.equal(next.goals.length, 20);
  assert.equal(new Set(next.goals.map((g) => g.id)).size, 20);
});
