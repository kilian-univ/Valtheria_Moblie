import assert from 'node:assert/strict';
import { test } from 'node:test';

import { keysToPurge } from '@/src/utils/purge';

const KEYS = [
  'api_token',
  'valtheria:patrimoine:15',
  'valtheria:carnet:15',
  'valtheria:carnet:150',
  'valtheria:apprendre:lastModuleId:15',
  'valtheria:dictionnaire:mesMots:15',
  'valtheria:carnet:invite',
  'valtheria:premiere-ouverture',
  'valtheria:lastProfile',
  'valtheria:rappel',
  'valtheria:sons',
  'valtheria:carnet:22',
];

test('suppression du compte 15 : ses données, celles de l’invité et les données personnelles', () => {
  const purged = keysToPurge(KEYS, 15);
  for (const k of ['valtheria:patrimoine:15', 'valtheria:carnet:15', 'valtheria:apprendre:lastModuleId:15', 'valtheria:dictionnaire:mesMots:15', 'valtheria:carnet:invite', 'valtheria:premiere-ouverture', 'valtheria:lastProfile', 'valtheria:rappel']) {
    assert.ok(purged.includes(k), k);
  }
});

test('jamais un autre compte, ni les réglages de l’appareil', () => {
  const purged = keysToPurge(KEYS, 15);
  for (const k of ['valtheria:carnet:150', 'valtheria:carnet:22', 'valtheria:sons', 'api_token']) assert.ok(!purged.includes(k), k);
});
