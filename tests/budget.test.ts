/// <reference types="node" />
// Lancer : npm test
// Budget (lot 1) : dates de paie, « tu peux encore dépenser », charges du
// cycle, répartition 50/30/20, pavé numérique, mise en route et reprise de
// l'ancien Cash-flow, remarques de Val.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cycleCharges, mainIncome, payCycle, spendable, split, splitPercents, STALE_DAYS } from '../src/utils/budget/calc';
import { euros, signedEuros } from '../src/utils/budget/format';
import { addDays, agoLabel, daysBetween, lastOccurrence, nextOccurrence, occurrencesBetween } from '../src/utils/budget/dates';
import { padDisplay, padText, padValue, pressKey, type PadKey } from '../src/utils/budget/keypad';
import { parseBudget, type BudgetCategory, type Recurring } from '../src/utils/budget/model';
import { chargesTotal, draftFrom, fromLegacy, setupPayload, stepReady, suggestedSaving } from '../src/utils/budget/setup';
import { chooseBudgetTip, FORBIDDEN_TONE } from '../src/utils/budget/tips';

const plain = (s: string) => s.replace(/[\u00A0\u202F]/g, ' ');

let nextId = 1;
const rec = (type: Recurring['type'], amount: number, day: number | null, category: string | null = null, label = category ?? type): Recurring => ({
  id: nextId++,
  type,
  category,
  label,
  amount,
  day,
});

// Le budget de la maquette : paie de 1 800 € le 31, cinq charges, 200 € mis de côté le 31
const RECURRING: Recurring[] = [
  rec('revenu', 1800, 31, null, 'Paie'),
  rec('depense', 600, 5, 'Loyer'),
  rec('depense', 35, 8, 'Internet / téléphone', 'Téléphone et internet'),
  rec('depense', 70, 20, 'Charges (élec, eau, gaz)', 'Énergie'),
  rec('depense', 108, 22, 'Abonnements'),
  rec('depense', 45, 28, 'Assurances'),
  rec('epargne', 200, 31, null, 'Mis de côté en premier'),
];

const CATEGORIES: BudgetCategory[] = [
  { id: 1, name: 'Loyer', color: '#C97F63', family: 'besoins', envelopeCap: null },
  { id: 2, name: 'Internet / téléphone', color: '#7B9CC4', family: 'besoins', envelopeCap: null },
  { id: 3, name: 'Charges (élec, eau, gaz)', color: '#C9885C', family: 'besoins', envelopeCap: null },
  { id: 4, name: 'Abonnements', color: '#6FA896', family: 'envies', envelopeCap: null },
  { id: 5, name: 'Assurances', color: '#9C8FB8', family: 'besoins', envelopeCap: null },
  { id: 6, name: 'Courses', color: '#B9915B', family: 'besoins', envelopeCap: 300 },
];

test('dates : jour de paie ramené au dernier jour du mois, occurrences entre deux dates', () => {
  assert.equal(nextOccurrence(31, '2026-11-02'), '2026-11-30');
  assert.equal(nextOccurrence(31, '2026-10-31'), '2026-11-30');
  assert.equal(nextOccurrence(5, '2026-10-18'), '2026-11-05');
  assert.equal(lastOccurrence(31, '2026-10-18'), '2026-09-30');
  assert.equal(lastOccurrence(18, '2026-10-18'), '2026-10-18');
  assert.deepEqual(occurrencesBetween(20, '2026-10-15', '2026-12-20'), ['2026-10-20', '2026-11-20']);
  assert.deepEqual(occurrencesBetween(20, '2026-10-20', '2026-10-31'), []);
  assert.equal(daysBetween('2026-10-18', '2026-10-31'), 13);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(nextOccurrence(29, '2027-02-01'), '2027-02-28');
  assert.equal(agoLabel(0), 'aujourd’hui');
  assert.equal(agoLabel(1), 'hier');
  assert.equal(agoLabel(3), 'il y a 3 jours');
});

test('paie : la plus grosse rentrée avec un jour ; cycle autour d’aujourd’hui', () => {
  assert.equal(mainIncome(RECURRING)?.amount, 1800);
  assert.deepEqual(payCycle(RECURRING, '2026-10-18'), { last: '2026-09-30', next: '2026-10-31', payDay: 31 });
  // Le jour de la paie : elle est arrivée, la suivante est le mois prochain
  assert.deepEqual(payCycle(RECURRING, '2026-10-31'), { last: '2026-10-31', next: '2026-11-30', payDay: 31 });
  // Sans paie : le mois civil
  assert.deepEqual(payCycle([], '2026-10-18'), { last: '2026-10-01', next: '2026-11-01', payDay: null });
});

test('tu peux encore dépenser : solde du jour, charges à venir, épargne pas encore faite', () => {
  const s = spendable({ recurring: RECURRING, balances: [{ amount: 1287, on: '2026-10-18' }], today: '2026-10-18' })!;
  // Encore à payer d'ici le 31 : énergie 70, abonnements 108, assurances 45 ; l'épargne du 31 tombe le jour de la paie
  assert.equal(s.toPay, 223);
  assert.equal(s.savings, 0);
  assert.equal(s.incoming, 0);
  assert.equal(s.amount, 1287 - 223);
  assert.equal(s.days, 13);
  assert.equal(s.perDay, Math.floor(1064 / 13));
  assert.equal(s.payDate, '2026-10-31');
  assert.equal(s.stale, false);
});

test('tu peux encore dépenser : une charge passée depuis le relevé est retirée, l’épargne faite ne l’est plus', () => {
  const recurring = [rec('revenu', 2000, 1, null, 'Paie'), rec('depense', 600, 5, 'Loyer'), rec('depense', 50, 25, 'Assurances'), rec('epargne', 200, 3)];
  // Relevé le 2, aujourd'hui le 10 : loyer du 5 et épargne du 3 sont tombés après le relevé
  const old = spendable({ recurring, balances: [{ amount: 2500, on: '2026-10-02' }], today: '2026-10-10' })!;
  assert.equal(old.toPay, 650);
  assert.equal(old.savings, 200);
  assert.equal(old.amount, 2500 - 650 - 200);
  // Même situation, relevé fait aujourd'hui (loyer et épargne déjà partis) : seule l'assurance reste
  const fresh = spendable({ recurring, balances: [{ amount: 2500 - 600 - 200, on: '2026-10-10' }], today: '2026-10-10' })!;
  assert.equal(fresh.toPay, 50);
  assert.equal(fresh.savings, 0);
  assert.equal(fresh.amount, 1650);
  assert.equal(fresh.amount, old.amount, 'le même argent, quel que soit le jour du relevé');
});

test('tu peux encore dépenser : un vieux relevé d’avant la paie compte la paie arrivée depuis', () => {
  // Relevé le 25 septembre, paie le 30 (dernier jour), aujourd'hui le 18 octobre
  const s = spendable({ recurring: RECURRING, balances: [{ amount: 300, on: '2026-09-25' }], today: '2026-10-18' })!;
  assert.equal(s.incoming, 1800);
  // Charges du 28 sept. puis de tout octobre avant le 31, épargne du 30 sept.
  assert.equal(s.toPay, 45 + 600 + 35 + 70 + 108 + 45);
  assert.equal(s.savings, 200);
  assert.equal(s.amount, 300 + 1800 - 903 - 200);
  assert.equal(s.balanceAge, 23);
  assert.equal(s.stale, true, `plus de ${STALE_DAYS} jours : à confirmer`);
});

test('tu peux encore dépenser : mode Détaillé, dépenses et rentrées notées après le relevé', () => {
  const s = spendable({
    recurring: RECURRING,
    balances: [{ amount: 1287, on: '2026-10-15' }],
    today: '2026-10-18',
    entries: [
      { id: 1, type: 'depense', category: 'Courses', label: 'Supermarché', amount: 23.5, on: '2026-10-17' },
      { id: 2, type: 'depense', category: 'Sorties', label: 'Cinéma', amount: 12, on: '2026-10-15' },
      { id: 3, type: 'revenu', category: null, label: 'Remboursement de Sam', amount: 20, on: '2026-10-16' },
    ],
  })!;
  assert.equal(s.spent, 23.5, 'la dépense du jour du relevé y est déjà');
  assert.equal(s.received, 20);
  assert.equal(s.amount, 1287 - 223 - 23.5 + 20);
  // Rien à dire sans relevé ; trop dépensé : 0 € par jour, jamais négatif
  assert.equal(spendable({ recurring: RECURRING, balances: [], today: '2026-10-18' }), null);
  assert.equal(spendable({ recurring: RECURRING, balances: [{ amount: 100, on: '2026-10-18' }], today: '2026-10-18' })!.perDay, 0);
});

test('ce qui va encore partir : charges du cycle dans l’ordre, celles passées cochées', () => {
  const list = cycleCharges(RECURRING, '2026-10-18');
  assert.deepEqual(
    list.map((c) => [c.label, c.date, c.done]),
    [
      ['Loyer', '2026-10-05', true],
      ['Téléphone et internet', '2026-10-08', true],
      ['Énergie', '2026-10-20', false],
      ['Abonnements', '2026-10-22', false],
      ['Assurances', '2026-10-28', false],
    ]
  );
});

test('répartition : besoins, envies (le reste), épargne, comparés à 50/30/20', () => {
  const s = split({ recurring: RECURRING, categories: CATEGORIES })!;
  assert.equal(s.besoins, 600 + 35 + 70 + 45);
  assert.equal(s.epargne, 200);
  assert.equal(s.envies, 1800 - 750 - 200);
  const p = splitPercents(s);
  assert.equal(p.besoins + p.envies + p.epargne, 100);
  assert.deepEqual(p, { besoins: 42, envies: 47, epargne: 11 });
  assert.equal(split({ recurring: [], categories: CATEGORIES }), null);
});

test('pavé numérique : virgule, deux décimales, effacer, négatif, affichage', () => {
  const type = (keys: PadKey[], from = '') => keys.reduce(pressKey, from);
  assert.equal(type(['1', '2', '8', '7']), '1287');
  assert.equal(type(['0', '5']), '5');
  assert.equal(type([',', '5']), '0,5');
  assert.equal(type(['2', '3', ',', '5', '0', '9']), '23,50');
  assert.equal(type(['del'], '23,5'), '23,');
  assert.equal(type(['-'], '40'), '-40');
  assert.equal(padValue('23,50'), 23.5);
  assert.equal(padValue('-40'), -40);
  assert.equal(padValue(''), null);
  assert.equal(padText(23.5), '23,5');
  assert.equal(plain(padDisplay('1287')), '1 287 €');
  assert.equal(plain(padDisplay('-40')), '− 40 €');
  assert.equal(plain(padDisplay('')), '0 €');
  // Pas plus de 8 chiffres
  assert.equal(type(['9', '9', '9', '9', '9', '9', '9', '9', '9']), '99999999');
});

test('mise en route : 10 % proposés, étapes complètes, corps envoyé au serveur', () => {
  assert.equal(suggestedSaving(1800), 180);
  assert.equal(suggestedSaving(1234), 120);
  assert.equal(suggestedSaving(null), null);
  const d = draftFrom(null);
  assert.equal(d.charges.length, 7);
  assert.equal(stepReady(d, 0), false);
  d.income = 1800;
  d.payDay = 31;
  assert.equal(stepReady(d, 0), true);
  d.charges[0].amount = 600;
  assert.equal(stepReady(d, 1), false, 'une charge commencée attend son jour');
  d.charges[0].day = 5;
  assert.equal(stepReady(d, 1), true);
  assert.equal(chargesTotal(d.charges), 600);
  d.saving = 180;
  d.balance = 1287;
  const body = setupPayload(d);
  assert.deepEqual(body.income, { amount: 1800, day: 31, label: 'Paie' });
  assert.deepEqual(body.charges, [{ category: 'Loyer', label: 'Loyer', amount: 600, day: 5 }]);
  assert.deepEqual(body.saving, { amount: 180, day: 31 });
  assert.equal(body.balance, 1287);
});

test('reprise de l’ancien Cash-flow : rentrées additionnées, charges rangées, jours à choisir', () => {
  const draft = fromLegacy([
    { type: 'revenu', category: null, label: 'Salaire', amount: 1500 },
    { type: 'revenu', category: null, label: 'APL', amount: 120 },
    { type: 'depense', category: 'Loyer', label: 'Loyer', amount: 550 },
    { type: 'depense', category: 'Prêt / crédit', label: 'Voiture', amount: 150 },
    { type: 'depense', category: 'Essence', label: 'Essence', amount: 60 },
    { type: 'depense', category: 'Santé', label: 'Mutuelle', amount: 40 },
    { type: 'epargne', category: null, label: 'Livret A', amount: 100 },
  ]);
  assert.equal(draft.income, 1620);
  assert.equal(draft.saving, 100);
  const byKey = Object.fromEntries(draft.charges.map((c) => [c.key, c]));
  assert.equal(byKey.logement.amount, 700);
  assert.equal(byKey.logement.category, 'Prêt / crédit');
  assert.equal(byKey.transport.amount, 60);
  assert.equal(byKey.autre.amount, 40);
  assert.ok(draft.charges.every((c) => c.day === null), 'les jours sont à choisir');
  assert.equal(stepReady(draft, 1), false);
  // Depuis la réponse du serveur
  const parsed = parseBudget({ settings: { setup_done: false }, legacy: [{ type: 'revenu', label: 'Salaire', amount: '1500' }] });
  assert.equal(draftFrom(parsed).income, 1500);
});

test('modifier un budget en route : les valeurs actuelles, avec leurs jours', () => {
  const budget = parseBudget({
    settings: { setup_done: true, mode: 'detaille' },
    recurring: RECURRING.map((r) => ({ id: r.id, type: r.type, category: r.category, label: r.label, amount: r.amount, day_of_month: r.day })),
    balances: [{ amount: 1287, recorded_on: '2026-10-18' }],
  });
  const d = draftFrom(budget);
  assert.equal(d.income, 1800);
  assert.equal(d.payDay, 31);
  assert.equal(d.saving, 200);
  assert.equal(d.mode, 'detaille');
  assert.equal(d.charges.find((c) => c.key === 'energie')?.day, 20);
  assert.equal(d.balance, 1287);
});

test('lecture de GET /budget : champs manquants sans risque', () => {
  const b = parseBudget({
    today: '2026-10-18',
    settings: { mode: 'x', envelope_alert_pct: 10 },
    categories: [{ id: 3, name: 'Courses', color: '#B9915B', family: 'besoins', envelope_cap: '300' }, { id: 0, name: 'x' }],
    recurring: [{ id: 1, type: 'depense', label: 'Loyer', amount: 600, day_of_month: 40 }, { id: 2, type: 'autre' }],
    entries: [{ id: 5, type: 'depense', amount: 12, occurred_on: '2026-10-16' }, { id: 6, type: 'depense', amount: 3 }],
    balances: [{ amount: 900, recorded_on: '2026-10-18' }, { amount: -40, recorded_on: '2026-10-01' }, { amount: 'x', recorded_on: '2026-10-02' }],
  });
  assert.equal(b.settings.mode, 'essentiel');
  assert.equal(b.settings.envelopeAlertPct, 80);
  assert.equal(b.categories.length, 1);
  assert.equal(b.categories[0].envelopeCap, 300);
  assert.equal(b.recurring.length, 1);
  assert.equal(b.recurring[0].day, null);
  assert.equal(b.entries.length, 1);
  assert.deepEqual(b.balances.map((x) => x.on), ['2026-10-01', '2026-10-18'], 'relevés dans l’ordre');
  assert.deepEqual(parseBudget('Server Error').recurring, []);
});

test('remarques de Val : abonnements, épargne, mois qui dépassent, enveloppe, jamais de morale', () => {
  const sub = chooseBudgetTip({ income: 1800, subscriptions: 108, saving: 200 })!;
  assert.equal(sub.key, 'subscriptions');
  assert.equal(plain(sub.text), 'Tes abonnements font 6 % de tes revenus : 108 € par mois, 1 296 € par an.');
  assert.equal(sub.link.universe, 'garder-la-main');
  assert.equal(chooseBudgetTip({ income: 1800, subscriptions: 30, saving: 100 })!.key, 'low_saving');
  assert.equal(chooseBudgetTip({ income: 1800, subscriptions: 30, saving: 0 })!.key, 'low_saving');
  assert.equal(chooseBudgetTip({ income: 1800, subscriptions: 30, saving: 300 })!.key, 'steady');
  assert.equal(chooseBudgetTip({ income: 1800, subscriptions: 30, saving: 300, greenMonths: [true, false, false] })!.key, 'overspend');
  assert.equal(chooseBudgetTip({ income: 1800, subscriptions: 30, saving: 300, greenMonths: [false, null, true] })!.key, 'steady');
  assert.equal(chooseBudgetTip({ income: 1800, subscriptions: 200, saving: 0, envelopeOverTwice: 'Sorties' })!.key, 'envelope_over');
  assert.equal(chooseBudgetTip({ income: 0, subscriptions: 0, saving: 0 }), null);
  for (const t of [
    chooseBudgetTip({ income: 1800, subscriptions: 108, saving: 200 }),
    chooseBudgetTip({ income: 1800, subscriptions: 30, saving: 0 }),
    chooseBudgetTip({ income: 1800, subscriptions: 30, saving: 300, greenMonths: [false, false, false] }),
    chooseBudgetTip({ income: 1800, subscriptions: 30, saving: 300, envelopeOverTwice: 'Sorties' }),
    chooseBudgetTip({ income: 1800, subscriptions: 30, saving: 300 }),
  ]) {
    assert.doesNotMatch(t!.text, FORBIDDEN_TONE);
  }
});

test('montants du budget : à l’euro quand ils sont ronds, centimes sinon', () => {
  assert.equal(plain(euros(70)), '70 €');
  assert.equal(plain(euros(1287)), '1 287 €');
  assert.equal(plain(euros(23.5)), '23,50 €');
  assert.equal(plain(euros(0.5)), '0,50 €');
  assert.equal(plain(euros(-40)), '−40 €');
  assert.equal(plain(signedEuros(-675)), '− 675 €');
  assert.equal(plain(signedEuros(20)), '+ 20 €');
  assert.equal(plain(signedEuros(0)), '0 €');
});
