import { useBudgetView } from '@/src/hooks/useBudgetView';
import { localToday, monthKey } from '@/src/utils/budget/dates';
import { shiftKey } from '@/src/utils/budget/flows';
import BilanScreen from './BilanScreen';
import BudgetScreen from './BudgetScreen';
import BudgetSetupScreen from './BudgetSetupScreen';
import BudgetStateScreen from './BudgetStateScreen';
import CashflowScreen from './CashflowScreen';

type Page = 'budget' | 'cashflow' | 'bilan';

const TITLES: Record<Page, string> = { budget: 'Mon budget', cashflow: 'Cash-flow', bilan: 'Ton bilan' };

// Mon budget, son cash-flow ou le bilan d'un mois, ou leur état (chargement,
// sans compte, erreur), ou la mise en route tant qu'elle n'est pas faite (une
// seule fois)
export default function BudgetGate({ page = 'budget', month }: { page?: Page; month?: string }) {
  const v = useBudgetView();
  const budget = v.data.budget;
  if (v.view !== 'ready' || !budget || !v.userKey) {
    return <BudgetStateScreen view={v.view === 'ready' ? 'loading' : v.view} title={TITLES[page]} errorKind={v.errorKind} onRetry={v.retry} />;
  }
  if (!budget.settings.setupDone) return <BudgetSetupScreen budget={budget} userKey={v.userKey} editing={false} />;
  if (page === 'cashflow') return <CashflowScreen budget={budget} />;
  if (page === 'bilan') {
    const m = month && /^\d{4}-\d{2}$/.test(month) ? month : shiftKey(monthKey(localToday()), -1);
    return <BilanScreen budget={budget} userKey={v.userKey} month={m} />;
  }
  return <BudgetScreen budget={budget} userKey={v.userKey} stale={v.stale} staleKind={v.data.errorKind ?? 'server'} />;
}
