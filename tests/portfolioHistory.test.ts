/// <reference types="node" />
// Lancer : npm test
// Courbe « Évolution » du portefeuille (utils/portfolioHistory.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { historyBounds, historyPoints } from '../src/utils/portfolioHistory';

const SERIES = [
  { date: '2026-10-01T08:00:00+00:00', value: 1000, is_snapshot: true },
  { date: '2026-10-08T08:00:00+00:00', value: 1100.5, is_snapshot: true },
];

test('le tableau déplié par la couche API est lu tel quel', () => {
  assert.deepEqual(historyPoints(SERIES), SERIES);
});

test('la réponse entière { data } est lue aussi', () => {
  assert.deepEqual(historyPoints({ data: SERIES, range: '1m', total_invested: 900, current_value: 1100.5 }), SERIES);
});

test('réponse vide ou invalide : aucun point', () => {
  assert.deepEqual(historyPoints(null), []);
  assert.deepEqual(historyPoints({ range: '1m' }), []);
  assert.deepEqual(historyPoints('erreur'), []);
});

test('points invalides écartés, valeurs en texte converties', () => {
  const raw = [{ date: '2026-10-01', value: '12.5' }, { date: '2026-10-02' }, { value: 3 }, null, { date: 'x', value: 'abc' }];
  assert.deepEqual(historyPoints(raw), [{ date: '2026-10-01', value: 12.5, is_snapshot: false }]);
});

test("l'investi entre dans les bornes, pour que sa ligne reste visible", () => {
  assert.deepEqual(historyBounds([1000, 1100], 800), { min: 800, max: 1100 });
  assert.deepEqual(historyBounds([1000, 1100], 1200), { min: 1000, max: 1200 });
  assert.deepEqual(historyBounds([1000, 1100], 1050), { min: 1000, max: 1100 });
});

test('investi absent ou nul : seules les valeurs comptent', () => {
  assert.deepEqual(historyBounds([1000, 1100], null), { min: 1000, max: 1100 });
  assert.deepEqual(historyBounds([1000, 1100], 0), { min: 1000, max: 1100 });
  assert.deepEqual(historyBounds([], null), { min: 0, max: 1 });
});
