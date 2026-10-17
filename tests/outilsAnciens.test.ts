import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeCashflow } from '@/src/utils/cashflow';
import { normalizeSavings } from '@/src/utils/savings';

// Le 17/10, Cash-flow plantait sur { } (« reading 'depenses' ») : toute réponse
// donne désormais des listes et des totaux
test('Cash-flow : une réponse vide ou partielle ne laisse aucun champ manquant', () => {
  for (const raw of [{}, null, 'Server Error', { entries: null, by_category: {} }, { totals: { reste: '12' } }]) {
    const d = normalizeCashflow(raw);
    assert.deepEqual(d.by_category.depenses, []);
    assert.deepEqual(d.entries.depenses, []);
    assert.equal(typeof d.totals.reste, 'number');
  }
  assert.equal(normalizeCashflow({ totals: { reste: '12' } }).totals.reste, 12);
});

test('Cash-flow : les entrées sans identifiant sont écartées', () => {
  const d = normalizeCashflow({ entries: { depenses: [{ id: 1, label: 'Loyer' }, { label: 'sans id' }, null] } });
  assert.equal(d.entries.depenses.length, 1);
});

test('Épargne : réponse vide, rapprochement partiel, objectif sans cible', () => {
  assert.deepEqual(normalizeSavings({}), { goals: [], just_achieved: [], reminders_count: 0, reconciliation: null });
  const d = normalizeSavings({ reconciliation: { epargne_mensuelle: 200 }, goals: [{ id: 0, name: 'Voyage' }] });
  assert.equal(d.reconciliation?.depassement.actif, false);
  assert.equal(d.reconciliation?.surplus.montant, 0);
  assert.equal(d.goals[0].id, 0);
  assert.equal(d.goals[0].target, null);
  assert.equal(d.goals[0].label, 'Voyage');
});
