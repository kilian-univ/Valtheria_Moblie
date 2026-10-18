// « Tu peux encore dépenser » et ce qui l'entoure. Tout part d'un seul
// chiffre tenu à jour à la main : le solde du compte, relevé à une date R.
// Fonctions pures, testables avec Node.
//
// Fenêtre de calcul : de R (exclu, le relevé compte tout ce qui est passé ce
// jour-là) à la prochaine paie P (exclue, ce qui tombe le jour de la paie
// passe après elle). Dans cette fenêtre :
//   solde − charges fixes à venir − épargne prévue pas encore faite
//         + rentrées attendues (une paie arrivée depuis un vieux relevé)
//         − dépenses notées depuis le relevé + rentrées notées (mode Détaillé)
// Un relevé ancien reste juste : ce qui est tombé depuis est retiré.

import { addDays, dayOfMonth, daysBetween, lastOccurrence, monthOf, nextOccurrence, occurrencesBetween, type Day } from './dates';
import type { Balance, BudgetCategory, Entry, Family, Recurring } from './model';
import { familyOf } from './model';

// Au-delà, le solde est « à confirmer »
export const STALE_DAYS = 7;

// Paie : la plus grosse rentrée récurrente qui a un jour
export function mainIncome(recurring: readonly Recurring[]): Recurring | null {
  return (
    recurring
      .filter((r) => r.type === 'revenu' && r.day !== null)
      .sort((a, b) => b.amount - a.amount || a.id - b.id)[0] ?? null
  );
}

// Cycle de paie autour d'aujourd'hui : dernière paie (≤ aujourd'hui) et
// prochaine (> aujourd'hui). Sans paie : le mois civil.
export function payCycle(recurring: readonly Recurring[], today: Day): { last: Day; next: Day; payDay: number | null } {
  const pay = mainIncome(recurring);
  if (!pay || pay.day === null) {
    const next = nextOccurrence(1, today);
    return { last: lastOccurrence(1, today), next, payDay: null };
  }
  return { last: lastOccurrence(pay.day, today), next: nextOccurrence(pay.day, today), payDay: pay.day };
}

export function latestBalance(balances: readonly Balance[]): Balance | null {
  return balances.length ? balances[balances.length - 1] : null;
}

// Somme des récurrents d'un type qui tombent entre from et to (exclus)
function recurringBetween(recurring: readonly Recurring[], type: Recurring['type'], from: Day, to: Day): number {
  let total = 0;
  for (const r of recurring) {
    if (r.type !== type || r.day === null) continue;
    total += r.amount * occurrencesBetween(r.day, from, to).length;
  }
  return total;
}

export type Spendable = {
  balance: number;
  balanceOn: Day;
  // Jours depuis le relevé ; « à confirmer » au-delà de STALE_DAYS
  balanceAge: number;
  stale: boolean;
  // Charges fixes encore à payer d'ici la paie (depuis le relevé)
  toPay: number;
  // Épargne prévue pas encore faite
  savings: number;
  // Rentrées tombées ou attendues depuis le relevé (paie arrivée entre-temps…)
  incoming: number;
  // Mode Détaillé : dépenses et rentrées notées depuis le relevé
  spent: number;
  received: number;
  amount: number;
  payDate: Day;
  payDay: number | null;
  // Jours jusqu'à la paie (1 au moins)
  days: number;
  perDay: number;
};

// Épargne confirmée faite à la main (« c'est fait ») : occurrence
// (« <id>:<date> ») → jour de la confirmation. Elle n'est plus retirée quand
// le solde relevé est d'après la confirmation (il en tient déjà compte).
export type SavingsDone = Record<string, Day>;

export const savingKey = (id: number, date: Day) => `${id}:${date}`;

// Épargne prévue à retirer entre from et to (exclus), moins celle confirmée
// faite avant le relevé
function savingsBetween(recurring: readonly Recurring[], from: Day, to: Day, balanceOn: Day, done: SavingsDone): number {
  let total = 0;
  for (const r of recurring) {
    if (r.type !== 'epargne' || r.day === null) continue;
    for (const d of occurrencesBetween(r.day, from, to)) {
      const confirmed = done[savingKey(r.id, d)];
      if (confirmed !== undefined && confirmed <= balanceOn) continue;
      total += r.amount;
    }
  }
  return total;
}

// Repère d'un relevé fait sur ce téléphone : le jour, et le plus grand numéro
// d'entrée connu à ce moment. Une dépense du même jour au numéro plus grand
// a été notée après le relevé : elle n'y est pas encore.
export type BalanceMark = { on: Day; maxEntryId: number };

// Ponctuels à compter après le relevé du jour R : ceux d'après R ; ceux du
// jour R seulement s'ils ont été notés après le relevé (repère)
export function entriesAfter(entries: readonly Entry[], from: Day, today: Day, mark: BalanceMark | null = null): Entry[] {
  return entries.filter((e) => e.on <= today && (e.on > from || (e.on === from && mark !== null && mark.on === from && e.id > mark.maxEntryId)));
}

export function spendable({
  recurring,
  balances,
  today,
  entries = [],
  mark = null,
  savingsDone = {},
}: {
  recurring: readonly Recurring[];
  balances: readonly Balance[];
  today: Day;
  // Ponctuels (mode Détaillé) ; vide en mode Essentiel
  entries?: readonly Entry[];
  mark?: BalanceMark | null;
  savingsDone?: SavingsDone;
}): Spendable | null {
  const b = latestBalance(balances);
  if (!b) return null;
  const { next, payDay } = payCycle(recurring, today);
  const from = b.on;
  const toPay = recurringBetween(recurring, 'depense', from, next);
  const savings = savingsBetween(recurring, from, next, b.on, savingsDone);
  const incoming = recurringBetween(recurring, 'revenu', from, next);
  // Ponctuels notés après le relevé (ceux du jour du relevé y sont déjà,
  // sauf ceux notés après lui sur ce téléphone)
  const after = entriesAfter(entries, from, today, mark);
  const spent = after.filter((e) => e.type === 'depense').reduce((s, e) => s + e.amount, 0);
  const received = after.filter((e) => e.type === 'revenu').reduce((s, e) => s + e.amount, 0);
  const amount = round2(b.amount - toPay - savings + incoming - spent + received);
  const days = Math.max(1, daysBetween(today, next));
  const age = Math.max(0, daysBetween(b.on, today));
  return {
    balance: b.amount,
    balanceOn: b.on,
    balanceAge: age,
    stale: age > STALE_DAYS,
    toPay,
    savings,
    incoming,
    spent,
    received,
    amount,
    payDate: next,
    payDay,
    days,
    perDay: amount > 0 ? Math.floor(amount / days) : 0,
  };
}

export type CycleCharge = { id: number; label: string; amount: number; date: Day; day: number; done: boolean };

// « Ce qui va encore partir » : chaque charge fixe dans le cycle de paie en
// cours, dans l'ordre ; celles déjà passées sont cochées
export function cycleCharges(recurring: readonly Recurring[], today: Day): CycleCharge[] {
  const { last, next } = payCycle(recurring, today);
  const out: CycleCharge[] = [];
  for (const r of recurring) {
    if (r.type !== 'depense' || r.day === null) continue;
    const date = nextOccurrence(r.day, addDays(last, -1));
    if (date >= next) continue;
    out.push({ id: r.id, label: r.label, amount: r.amount, date, day: r.day, done: date <= today });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
}

// Montant mensuel d'un type de récurrents
export function monthly(recurring: readonly Recurring[], type: Recurring['type']): number {
  return recurring.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0);
}

export type Split = { besoins: number; envies: number; epargne: number; income: number };

// Répartition d'un mois (montants), comparée aux repères 50/30/20. Besoins :
// charges fixes et dépenses de la famille « besoins » ; épargne : ce qui est
// mis de côté ; envies : le reste des rentrées (ce qui reste à dépenser pour
// soi, que tu le notes ou non).
export function split({
  recurring,
  categories,
  entries = [],
}: {
  recurring: readonly Recurring[];
  categories: readonly BudgetCategory[];
  // Dépenses du mois notées (mode Détaillé)
  entries?: readonly Entry[];
}): Split | null {
  const income = monthly(recurring, 'revenu') + entries.filter((e) => e.type === 'revenu').reduce((s, e) => s + e.amount, 0);
  if (income <= 0) return null;
  const byFamily = (family: Family) =>
    recurring.filter((r) => r.type === 'depense' && familyOf(categories, r.category) === family).reduce((s, r) => s + r.amount, 0) +
    entries.filter((e) => e.type === 'depense' && familyOf(categories, e.category) === family).reduce((s, e) => s + e.amount, 0);
  const besoins = byFamily('besoins');
  const epargne = monthly(recurring, 'epargne');
  const envies = Math.max(byFamily('envies'), income - besoins - epargne);
  return { besoins, envies: Math.max(0, envies), epargne, income };
}

// Parts en pourcentages entiers qui font 100
export function splitPercents(s: Split): { besoins: number; envies: number; epargne: number } {
  const total = s.besoins + s.envies + s.epargne;
  if (total <= 0) return { besoins: 0, envies: 0, epargne: 0 };
  const besoins = Math.round((s.besoins / total) * 100);
  const epargne = Math.round((s.epargne / total) * 100);
  return { besoins, envies: Math.max(0, 100 - besoins - epargne), epargne };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type SavingLine =
  | { kind: 'none' }
  // Épargne encore retirée du calcul (prévue d'ici la paie, ou faite depuis le relevé)
  | { kind: 'amount'; amount: number }
  // Prévue plus tard ce mois-ci (le jour de la paie) : « prévue le 31 »
  | { kind: 'planned'; date: Day; keys: string[] }
  | { kind: 'done' };

// Ligne « Épargne prévue » de la carte : un montant tant qu'elle compte dans
// le calcul ; sinon « prévue le <jour> » avant son jour du mois (ou le jour
// même), « déjà mise de côté » une fois ce jour passé ou confirmée faite
export function savingLine(recurring: readonly Recurring[], s: Pick<Spendable, 'savings'>, today: Day, done: SavingsDone = {}): SavingLine {
  const plans = recurring.filter((r) => r.type === 'epargne' && r.amount > 0);
  if (plans.length === 0) return { kind: 'none' };
  if (s.savings > 0) return { kind: 'amount', amount: s.savings };
  const { year, month } = monthOf(today);
  const upcoming = plans
    .filter((r) => r.day !== null)
    .map((r) => ({ key: savingKey(r.id, dayOfMonth(year, month, r.day as number)), date: dayOfMonth(year, month, r.day as number) }))
    .filter((o) => o.date >= today && done[o.key] === undefined)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (upcoming.length === 0) return { kind: 'done' };
  return { kind: 'planned', date: upcoming[0].date, keys: upcoming.map((o) => o.key) };
}

// Confirmations de plus de trois mois : oubliées
export function pruneSavingsDone(done: SavingsDone, today: Day): SavingsDone {
  const limit = addDays(today, -92);
  return Object.fromEntries(Object.entries(done).filter(([, on]) => on >= limit));
}
