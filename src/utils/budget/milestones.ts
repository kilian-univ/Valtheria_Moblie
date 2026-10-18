// Gamification légère du budget : mois dans le vert d'affilée et étapes à
// collectionner (profil). Uniquement la régularité et l'épargne : jamais de
// récompense liée au montant dépensé. Une étape gagnée le reste. Fonctions
// pures, testables avec Node.

import { monthKey, type Day } from './dates';
import { spentByCategory } from './envelopes';
import { courantesByMonth, firstMonth, monthFlow, shiftKey } from './flows';
import type { Budget } from './model';
import { greenMonths } from './review';

export type BudgetMilestoneKey = 'premier_mois' | 'trois_verts' | 'premiere_enveloppe' | 'epargne_10' | 'epargne_20';

export const BUDGET_MILESTONES: readonly { key: BudgetMilestoneKey; title: string; short: string; hint: string; icon: string }[] = [
  { key: 'premier_mois', short: 'Premier mois', title: 'Premier mois complet', hint: 'Suis ton budget un mois entier, du 1er au dernier jour.', icon: 'calendar-outline' },
  { key: 'trois_verts', short: 'Trois verts', title: 'Trois mois dans le vert', hint: 'Finis trois mois d’affilée dans le vert.', icon: 'leaf-outline' },
  { key: 'premiere_enveloppe', short: 'Enveloppe tenue', title: 'Première enveloppe tenue', hint: 'Finis un mois sans dépasser une de tes enveloppes.', icon: 'mail-outline' },
  { key: 'epargne_10', short: 'Épargne 10 %', title: 'Taux d’épargne de 10 %', hint: 'Mets 10 % de tes rentrées de côté sur un mois.', icon: 'trending-up-outline' },
  { key: 'epargne_20', short: 'Épargne 20 %', title: 'Taux d’épargne de 20 %', hint: 'Mets 20 % de tes rentrées de côté sur un mois.', icon: 'trophy-outline' },
];

type Ctx = Pick<Budget, 'recurring' | 'entries' | 'balances' | 'categories' | 'settings'>;

// Mois terminés suivis, du plus ancien au plus récent (deux ans au plus)
function finishedMonths(budget: Ctx, today: Day): string[] {
  const start = firstMonth(budget, budget.settings.mode);
  if (!start) return [];
  const out: string[] = [];
  for (let m = shiftKey(monthKey(today), -1); m >= start && out.length < 24; m = shiftKey(m, -1)) out.unshift(m);
  return out;
}

// Plus longue suite de mois dans le vert
export function bestGreenRun(budget: Ctx, today: Day): number {
  let best = 0;
  let run = 0;
  for (const g of greenMonths(budget, today, budget.settings.mode, 24)) {
    run = g.green === true ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function budgetSatisfied(budget: Ctx, today: Day): BudgetMilestoneKey[] {
  const mode = budget.settings.mode;
  const courantes = courantesByMonth(budget);
  const flows = finishedMonths(budget, today).map((m) => monthFlow(budget, m, today, mode, courantes));
  const out: BudgetMilestoneKey[] = [];
  // Un mois entier suivi : dépenses connues sans estimation
  if (flows.some((f) => f.hasData && f.spent !== null && !f.estimated)) out.push('premier_mois');
  if (bestGreenRun(budget, today) >= 3) out.push('trois_verts');
  // Une enveloppe tenue : un mois terminé où des dépenses ont été notées dans
  // sa catégorie, sans dépasser le plafond
  const held = flows.some((f) => {
    const spent = spentByCategory(budget.entries, f.month);
    return budget.categories.some((c) => c.envelopeCap !== null && (spent[c.name] ?? 0) > 0 && (spent[c.name] ?? 0) <= c.envelopeCap + 0.005);
  });
  if (held) out.push('premiere_enveloppe');
  const best = Math.max(-Infinity, ...flows.map((f) => f.rate ?? -Infinity));
  if (best >= 0.1) out.push('epargne_10');
  if (best >= 0.2) out.push('epargne_20');
  return out;
}

export type BudgetEarned = Partial<Record<BudgetMilestoneKey, string>>;

// Nouvelles étapes (à fêter au bilan) et la mémoire mise à jour
export function earnBudget(earned: BudgetEarned, budget: Ctx, today: Day, at: string): { earned: BudgetEarned; fresh: BudgetMilestoneKey[] } {
  const fresh = budgetSatisfied(budget, today).filter((k) => !earned[k]);
  if (fresh.length === 0) return { earned, fresh };
  const next = { ...earned };
  for (const k of fresh) next[k] = at;
  return { earned: next, fresh };
}

// Mois dans le vert d'affilée, jusqu'au mois dernier
export function currentGreenRun(budget: Ctx, today: Day): number {
  const list = greenMonths(budget, today, budget.settings.mode, 24);
  let n = 0;
  for (let i = list.length - 1; i >= 0 && list[i].green === true; i--) n += 1;
  // Le mois dernier doit en faire partie
  return list.length && list[list.length - 1].month === shiftKey(monthKey(today), -1) ? n : 0;
}

// « 3 mois dans le vert d'affilée » ; rien sous 1
export function greenRunLabel(n: number): string | null {
  if (n < 1) return null;
  return n === 1 ? '1 mois dans le vert' : `${n} mois dans le vert d’affilée`;
}
