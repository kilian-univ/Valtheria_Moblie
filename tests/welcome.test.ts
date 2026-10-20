/// <reference types="node" />
// Lancer : npm test
// Écran de bienvenue (utils/welcome.ts) et arrondi des nombres (utils/format.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { roundedCount } from '../src/utils/format';
import { openUniversesCount, trustPills, universesLabel } from '../src/utils/welcome';

const NBSP = ' ';

test('arrondi vers le bas avec « + » : dizaine, centaine, millier', () => {
  assert.equal(roundedCount(9), null);
  assert.equal(roundedCount(10), '10+');
  assert.equal(roundedCount(43), '40+');
  assert.equal(roundedCount(99), '90+');
  assert.equal(roundedCount(100), '100+');
  assert.equal(roundedCount(203), '200+');
  assert.equal(roundedCount(930), '900+');
  assert.equal(roundedCount(999), '900+');
  assert.equal(roundedCount(1000), `1${NBSP}000+`);
  assert.equal(roundedCount(1340), `1${NBSP}000+`);
  assert.equal(roundedCount(12890), `12${NBSP}000+`);
  // Valeurs inutilisables
  assert.equal(roundedCount(0), null);
  assert.equal(roundedCount(-50), null);
  assert.equal(roundedCount(Number.NaN), null);
  assert.equal(roundedCount(null), null);
  assert.equal(roundedCount(undefined), null);
});

test('univers ouverts : ceux qui ont un module publié, jamais un nombre en dur', () => {
  const uni = (moduleIds: number[]) => ({ moduleIds });
  assert.equal(openUniversesCount([uni([1, 2]), uni([]), uni([3])]), 2);
  assert.equal(openUniversesCount([uni([]), uni([])]), 0);
  assert.equal(openUniversesCount([]), 0);
  // Liste indisponible (hors ligne, route absente) : inconnu
  assert.equal(openUniversesCount(null), null);
  assert.equal(openUniversesCount(undefined), null);
  assert.equal(universesLabel(1), '1 univers ouvert, d’autres arrivent');
  assert.equal(universesLabel(5), '5 univers');
  assert.equal(universesLabel(15), '15 univers');
});

test('pastilles de confiance : univers ouverts et mots, seulement avec un vrai nombre', () => {
  assert.deepEqual(
    trustPills(203, 1).map((p) => [p.icon, p.label]),
    [
      ['compass-outline', '1 univers ouvert, d’autres arrivent'],
      ['book-outline', '200+ mots expliqués'],
    ]
  );
  assert.deepEqual(
    trustPills(203, 5).map((p) => p.label),
    ['5 univers', '200+ mots expliqués']
  );
  // Nombre d'univers inconnu ou nul : pas de pastille des univers
  assert.deepEqual(
    trustPills(203).map((p) => p.label),
    ['200+ mots expliqués']
  );
  assert.deepEqual(
    trustPills(203, null).map((p) => p.label),
    ['200+ mots expliqués']
  );
  assert.deepEqual(
    trustPills(203, 0).map((p) => p.label),
    ['200+ mots expliqués']
  );
  // Nombre de mots indisponible ou trop petit : la pastille des mots disparaît
  assert.deepEqual(
    trustPills(null, 1).map((p) => p.label),
    ['1 univers ouvert, d’autres arrivent']
  );
  assert.deepEqual(
    trustPills(7, 1).map((p) => p.label),
    ['1 univers ouvert, d’autres arrivent']
  );
  assert.deepEqual(trustPills(undefined, undefined), []);
  // Jamais de pastille « Gratuit », deux au plus
  assert.ok(trustPills(5000, 15).length <= 2);
  assert.ok(trustPills(5000, 15).every((p) => !/gratuit/i.test(p.label)));
});
