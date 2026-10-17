import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LEARNING_CACHE_MAX_DAYS, parseLearningCache, parseWordsCache } from '@/src/utils/learningCache';
import { keysToPurge } from '@/src/utils/purge';

const NOW = new Date('2026-10-17T12:00:00Z');
const snap = (o: Record<string, unknown> = {}) =>
  JSON.stringify({ userId: 15, savedAt: '2026-10-16T08:00:00Z', modules: [{ id: 182 }], universes: [], streak: 3, xp: 2017, level: 11, vals: 3147, ...o });

test('la copie du même compte est relue, avec la série et les XP', () => {
  const s = parseLearningCache(snap(), 15, NOW)!;
  assert.equal(s.modules.length, 1);
  assert.equal(s.streak, 3);
  assert.equal(s.xp, 2017);
});

test('jamais la copie d’un autre compte, ni sans compte connu', () => {
  assert.equal(parseLearningCache(snap(), 22, NOW), null);
  assert.equal(parseLearningCache(snap(), null, NOW), null);
});

test(`copie trop ancienne (plus de ${LEARNING_CACHE_MAX_DAYS} jours) ou abîmée : ignorée`, () => {
  assert.equal(parseLearningCache(snap({ savedAt: '2026-08-01T00:00:00Z' }), 15, NOW), null);
  assert.equal(parseLearningCache('{pas du json', 15, NOW), null);
  assert.equal(parseLearningCache(snap({ modules: 'x' }), 15, NOW), null);
  assert.equal(parseWordsCache('[]'), null);
  assert.equal(parseWordsCache('[{"term":"Inflation"}]')!.length, 1);
});

test('aucun montant du patrimoine dans la copie, et elle part à la déconnexion', () => {
  const s = parseLearningCache(snap({ portfolio: { total: 27061 } }), 15, NOW)!;
  assert.ok(!('portfolio' in s));
  const keys = keysToPurge(['valtheria:apprendre:cache', 'valtheria:dictionnaire:cache'], 15);
  assert.equal(keys.length, 2);
});
