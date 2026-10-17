/// <reference types="node" />
// Lancer : npm test
// Parité du verdict avec le site : mêmes cas que tests/Unit/ScreenGraderTest.php
// et tests/js/grade.test.mjs du site. tests/fixtures/reader-grading.json est
// une copie de celui du site (lot serveur n° 9, commit 0609e41) : le recopier
// quand le site en ajoute.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { grade } from '../src/utils/grade';

type Case = { name: string; screen: { type?: unknown; scored?: unknown; payload?: unknown }; response: unknown; expected: boolean | null };

const cases: Case[] = JSON.parse(readFileSync(new URL('./fixtures/reader-grading.json', import.meta.url), 'utf8'));

test('grade : le jeu de cas du site est complet', () => {
  assert.ok(cases.length >= 70, `seulement ${cases.length} cas`);
  for (const v of [true, false, null]) assert.ok(cases.some((c) => c.expected === v), `aucun cas attendu à ${v}`);
  // Tous les types corrigés par le serveur sont couverts
  const types = new Set(cases.map((c) => c.screen.type));
  for (const t of ['choice', 'slider', 'document', 'dialogue', 'allocate', 'true_false', 'order', 'match', 'simulator', 'number', 'live_month']) {
    assert.ok(types.has(t), `aucun cas pour ${t}`);
  }
});

for (const c of cases) {
  test(`grade : ${c.name}`, () => {
    assert.equal(grade(c.screen, c.response), c.expected);
  });
}
