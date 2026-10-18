// Ce que le budget apporte au patrimoine. Fonctions pures, testables avec
// Node.
// - Épargne de précaution : les dépenses d'un mois se lisent dans le budget
//   (charges fixes + moyenne des dépenses courantes), plus besoin de les
//   saisir deux fois.
// - Régularité : l'épargne mise de côté chaque mois compte comme un versement.

import { dayOfMonth, monthKey, type Day } from './dates';
import { courantesByMonth, firstMonth, monthFlow, parseKey, shiftKey } from './flows';
import { monthly, round2 } from './calc';
import type { Budget } from './model';

type Ctx = Pick<Budget, 'recurring' | 'entries' | 'balances' | 'categories' | 'settings'>;

// Mois terminés pris pour la moyenne des dépenses courantes
export const AVERAGE_MONTHS = 3;

export type BudgetExpenses = { charges: number; average: number; total: number; months: number };

// Dépenses mensuelles d'après le budget ; null tant qu'aucun mois terminé n'a
// de dépenses courantes connues (ou sans mise en route)
export function budgetExpenses(budget: Ctx, today: Day): BudgetExpenses | null {
  if (!budget.settings.setupDone) return null;
  const mode = budget.settings.mode;
  const courantes = courantesByMonth(budget);
  const known: number[] = [];
  for (let m = shiftKey(monthKey(today), -1), i = 0; i < 12 && known.length < AVERAGE_MONTHS; m = shiftKey(m, -1), i++) {
    const f = monthFlow(budget, m, today, mode, courantes);
    if (f.hasData && f.variable !== null) known.push(f.variable);
  }
  if (known.length === 0) return null;
  const charges = monthly(budget.recurring, 'depense');
  const average = round2(known.reduce((s, v) => s + v, 0) / known.length);
  return { charges: round2(charges), average, total: round2(charges + average), months: known.length };
}

// Mois où de l'épargne a été mise de côté d'après le budget (« 2026-09 ») :
// du premier mois suivi jusqu'à aujourd'hui ; le mois en cours compte dès
// que le jour d'un virement d'épargne est passé
export function savingMonths(budget: Ctx, today: Day): string[] {
  if (!budget.settings.setupDone || monthly(budget.recurring, 'epargne') <= 0) return [];
  const start = firstMonth(budget, 'essentiel');
  if (!start) return [];
  const cur = monthKey(today);
  const savings = budget.recurring.filter((r) => r.type === 'epargne' && r.amount > 0);
  const out: string[] = [];
  for (let m = start; m < cur; m = shiftKey(m, 1)) out.push(m);
  const { year, month } = parseKey(cur);
  if (savings.some((r) => r.day === null || dayOfMonth(year, month, r.day) <= today)) out.push(cur);
  return out;
}
