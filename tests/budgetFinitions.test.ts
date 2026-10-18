/// <reference types="node" />
// Lancer : npm test
// Budget, finitions : modifier la mise en route garde le dernier relevé ;
// la ligne « Épargne prévue » (« prévue le 31 », « déjà mise de côté »,
// confirmation faite à la main).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pruneSavingsDone, savingKey, savingLine, spendable } from '../src/utils/budget/calc';
import type { Recurring } from '../src/utils/budget/model';
import { draftFrom, setupPayload, stepReady } from '../src/utils/budget/setup';

const RECURRING: Recurring[] = [
  { id: 1, type: 'revenu', category: null, label: 'Paie', amount: 1800, day: 31 },
  { id: 2, type: 'depense', category: 'Loyer', label: 'Loyer', amount: 600, day: 5 },
  { id: 4, type: 'epargne', category: null, label: 'Mis de côté en premier', amount: 200, day: 31 },
];

test('modifier la mise en route : le dernier relevé est gardé, aucun solde envoyé', () => {
  const d = { ...draftFrom(null), income: 1800, payDay: 31, saving: 200, balance: null };
  // Première mise en route : le solde est demandé
  assert.equal(stepReady(d, 3), false);
  assert.equal(setupPayload({ ...d, balance: 900 }).balance, 900);
  // Modification : l'étape est complète sans solde, et le corps n'en contient pas
  assert.equal(stepReady(d, 3, true), true);
  assert.equal('balance' in setupPayload({ ...d, balance: 900 }, true), false);
});

test('épargne prévue : « prévue le 31 » avant son jour, « déjà mise de côté » ensuite', () => {
  const balances = [{ amount: 1300, on: '2026-10-12' }];
  const s = spendable({ recurring: RECURRING, balances, today: '2026-10-18' })!;
  // L'épargne du 31 part avec la paie : elle ne compte pas dans ce cycle
  assert.equal(s.savings, 0);
  assert.deepEqual(savingLine(RECURRING, s, '2026-10-18'), { kind: 'planned', date: '2026-10-31', keys: [savingKey(4, '2026-10-31')] });
  // Le jour même : encore prévue
  assert.equal(savingLine(RECURRING, s, '2026-10-31').kind, 'planned');
  // Le mois d'après, relevé fait après la paie : celle de novembre (le 30) est à venir
  const after = spendable({ recurring: RECURRING, balances: [{ amount: 1500, on: '2026-11-01' }], today: '2026-11-03' })!;
  assert.equal(after.savings, 0);
  assert.equal(savingLine(RECURRING, after, '2026-11-03').kind, 'planned');
  // Paie le 25 : une fois le 25 passé, déjà mise de côté jusqu'à la fin du mois
  const on25 = RECURRING.map((r) => (r.type === 'depense' ? r : { ...r, day: 25 }));
  const s25 = spendable({ recurring: on25, balances: [{ amount: 1500, on: '2026-10-26' }], today: '2026-10-27' })!;
  assert.deepEqual(savingLine(on25, s25, '2026-10-27'), { kind: 'done' });
  // Sans épargne prévue : rien
  assert.equal(savingLine(RECURRING.filter((r) => r.type !== 'epargne'), s, '2026-10-18').kind, 'none');
});

test('épargne confirmée faite : « déjà mise de côté », et plus retirée d’un solde relevé après', () => {
  const key = savingKey(4, '2026-10-31');
  const done = { [key]: '2026-10-20' };
  const s = spendable({ recurring: RECURRING, balances: [{ amount: 1300, on: '2026-10-12' }], today: '2026-10-20', savingsDone: done })!;
  assert.deepEqual(savingLine(RECURRING, s, '2026-10-20', done), { kind: 'done' });
  // Après la paie, avec un relevé du 25 (après la confirmation) : le virement y est déjà
  const later = spendable({ recurring: RECURRING, balances: [{ amount: 1100, on: '2026-10-25' }], today: '2026-11-02', savingsDone: done })!;
  assert.equal(later.savings, 0);
  // Relevé d'avant la confirmation : le virement n'y est pas encore, il est retiré
  const older = spendable({ recurring: RECURRING, balances: [{ amount: 1300, on: '2026-10-12' }], today: '2026-11-02', savingsDone: done })!;
  assert.equal(older.savings, 200);
  assert.deepEqual(savingLine(RECURRING, older, '2026-11-02', done), { kind: 'amount', amount: 200 });
  // Les vieilles confirmations sont oubliées
  assert.deepEqual(pruneSavingsDone({ a: '2026-06-01', b: '2026-10-20' }, '2026-10-20'), { b: '2026-10-20' });
});
