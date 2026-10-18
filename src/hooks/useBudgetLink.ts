import { useApi } from '@/src/context/ApiContext';
import { useBudget } from '@/src/state/budgetData';
import { localToday } from '@/src/utils/budget/dates';
import { budgetExpenses, savingMonths, type BudgetExpenses } from '@/src/utils/budget/patrimoine';
import type { Emergency } from '@/src/utils/patrimoine/goals';

// Le budget vu depuis le patrimoine (relu discrètement s'il n'est pas déjà
// chargé) : les dépenses d'un mois pour l'épargne de précaution, et les mois
// d'épargne qui comptent pour la régularité. Rien sans compte ni mise en route.
export function useBudgetLink(): { expenses: BudgetExpenses | null; savingMonths: string[] } {
  const { user, get } = useApi();
  const key = user?.id != null ? String(user.id) : null;
  const s = useBudget(key, get);
  const budget = key !== null && s.user === key && s.budget?.settings.setupDone ? s.budget : null;
  if (!budget) return { expenses: null, savingMonths: [] };
  const today = localToday();
  return { expenses: budgetExpenses(budget, today), savingMonths: savingMonths(budget, today) };
}

// Épargne de précaution : les dépenses du budget remplacent celles tapées
export function effectiveEmergency(e: Emergency, expenses: BudgetExpenses | null): Emergency {
  return expenses ? { ...e, monthlyExpenses: expenses.total } : e;
}
