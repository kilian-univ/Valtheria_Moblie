// Bilan d'un mois terminé : dans le vert ou non, mis de côté, dépensé,
// restant, où est parti l'argent par rapport au mois d'avant, et la question
// de Val. « Dans le vert » : les dépenses ne dépassent pas ce qui restait
// après l'épargne prévue. Fonctions pures, testables avec Node.

import type { Day } from './dates';
import { monthKey, monthName } from './dates';
import { courantesByMonth, monthFlow, parseKey, shiftKey, type FlowFamily, type MonthFlow } from './flows';
import type { Budget, BudgetMode } from './model';

export const REVIEW_ANSWERS = [
  { key: 'moins_de_sorties', label: 'Moins de sorties', recall: 'faire moins de sorties' },
  { key: 'revoir_un_abonnement', label: 'Revoir un abonnement', recall: 'revoir un abonnement' },
  { key: 'mettre_plus_de_cote', label: 'Mettre plus de côté', recall: 'mettre plus de côté' },
  { key: 'rien', label: 'Rien, c’était bien', recall: 'rien changer, c’était bien' },
] as const;

export type ReviewAnswer = (typeof REVIEW_ANSWERS)[number]['key'];

type Ctx = Pick<Budget, 'recurring' | 'entries' | 'balances' | 'categories'>;

// Un mois est dans le vert si son restant (après l'épargne prévue) n'est pas
// négatif ; null quand ses dépenses ne sont pas connues
export function isGreen(f: MonthFlow): boolean | null {
  if (!f.hasData || f.rest === null) return null;
  return Math.round(f.rest) >= 0;
}

// Mois terminés, du plus ancien au plus récent (jusqu'à douze)
export function greenMonths(ctx: Ctx, today: Day, mode: BudgetMode, count = 12): { month: string; green: boolean | null }[] {
  const courantes = courantesByMonth(ctx);
  const cur = monthKey(today);
  const out: { month: string; green: boolean | null }[] = [];
  for (let i = count; i >= 1; i--) {
    const m = shiftKey(cur, -i);
    const f = monthFlow(ctx, m, today, mode, courantes);
    if (f.hasData) out.push({ month: m, green: isGreen(f) });
  }
  return out;
}

// Mois dans le vert d'affilée, en remontant depuis « upTo » (inclus)
export function greenStreak(ctx: Ctx, upTo: string, today: Day, mode: BudgetMode): number {
  const courantes = courantesByMonth(ctx);
  let n = 0;
  for (let m = upTo; n < 120; m = shiftKey(m, -1)) {
    const f = monthFlow(ctx, m, today, mode, courantes);
    if (f.current || isGreen(f) !== true) break;
    n += 1;
  }
  return n;
}

export type ReviewRow = { key: string; label: string; family: FlowFamily; amount: number; diff: number | null };

export type MonthReview = {
  month: string;
  green: boolean;
  saved: number;
  spent: number;
  rest: number;
  streak: number;
  estimated: boolean;
  rows: ReviewRow[];
  // Mois suivant, pour la question de Val (« octobre »)
  nextName: string;
  // Réponse donnée au bilan précédent, rappelée
  previousAnswer: ReviewAnswer | null;
  answer: ReviewAnswer | null;
};

// Bilan du mois « key » (terminé) ; null si ses dépenses ne sont pas connues
export function monthReview(budget: Ctx & Pick<Budget, 'reviews'>, key: string, today: Day, mode: BudgetMode): MonthReview | null {
  const courantes = courantesByMonth(budget);
  const f = monthFlow(budget, key, today, mode, courantes);
  if (!f.hasData || f.current || f.spent === null || f.rest === null) return null;
  const prev = monthFlow(budget, shiftKey(key, -1), today, mode, courantes);
  const rows = f.postes
    .filter((p) => p.family !== 'epargne')
    .sort((a, b) => b.amount - a.amount)
    .map((p) => {
      const before = prev.hasData && prev.spent !== null ? (prev.postes.find((x) => x.key === p.key)?.amount ?? 0) : null;
      return { key: p.key, label: p.label, family: p.family, amount: p.amount, diff: before === null ? null : Math.round(p.amount - before) };
    });
  const answerOf = (m: string) => {
    const a = budget.reviews.find((r) => r.month === m)?.answer;
    return REVIEW_ANSWERS.some((x) => x.key === a) ? (a as ReviewAnswer) : null;
  };
  const { month } = parseKey(shiftKey(key, 1));
  return {
    month: key,
    green: isGreen(f) === true,
    saved: f.planned,
    spent: f.spent,
    rest: f.rest,
    streak: greenStreak(budget, key, today, mode),
    estimated: f.estimated,
    rows,
    nextName: monthName(month),
    previousAnswer: answerOf(shiftKey(key, -1)),
    answer: answerOf(key),
  };
}

// Bilan à proposer à l'ouverture : celui du mois dernier, une seule fois, s'il
// a des chiffres et n'a pas encore été vu ni répondu
export function reviewToPropose(budget: Ctx & Pick<Budget, 'reviews'>, today: Day, mode: BudgetMode, shown: readonly string[]): string | null {
  const last = shiftKey(monthKey(today), -1);
  if (shown.includes(last) || budget.reviews.some((r) => r.month === last)) return null;
  return monthReview(budget, last, today, mode) ? last : null;
}
