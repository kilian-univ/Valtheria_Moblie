/// <reference types="node" />
// Lancer : npm test
// Écran de bienvenue (utils/welcome.ts) et arrondi des nombres (utils/format.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { roundedCount } from '../src/utils/format';
import { trustPills } from '../src/utils/welcome';

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

test('pastilles de confiance : « 15 univers », les mots seulement avec un nombre', () => {
  assert.deepEqual(
    trustPills(203).map((p) => [p.icon, p.label]),
    [
      ['compass-outline', '15 univers'],
      ['book-outline', '200+ mots expliqués'],
    ]
  );
  // Nombre indisponible ou trop petit : la pastille des mots disparaît
  assert.deepEqual(
    trustPills(null).map((p) => p.label),
    ['15 univers']
  );
  assert.deepEqual(
    trustPills(undefined).map((p) => p.label),
    ['15 univers']
  );
  assert.deepEqual(
    trustPills(7).map((p) => p.label),
    ['15 univers']
  );
  // Jamais de pastille « Gratuit », deux au plus
  assert.ok(trustPills(5000).length <= 2);
  assert.ok(trustPills(5000).every((p) => !/gratuit/i.test(p.label)));
});
