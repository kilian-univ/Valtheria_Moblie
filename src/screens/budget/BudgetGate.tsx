import { useBudgetView } from '@/src/hooks/useBudgetView';
import BudgetScreen from './BudgetScreen';
import BudgetSetupScreen from './BudgetSetupScreen';
import BudgetStateScreen from './BudgetStateScreen';

// Mon budget, ou son état (chargement, sans compte, erreur), ou la mise en
// route tant qu'elle n'est pas faite (une seule fois)
export default function BudgetGate() {
  const v = useBudgetView();
  const budget = v.data.budget;
  if (v.view !== 'ready' || !budget || !v.userKey) {
    return <BudgetStateScreen view={v.view === 'ready' ? 'loading' : v.view} title="Mon budget" errorKind={v.errorKind} onRetry={v.retry} />;
  }
  if (!budget.settings.setupDone) return <BudgetSetupScreen budget={budget} userKey={v.userKey} editing={false} />;
  return <BudgetScreen budget={budget} userKey={v.userKey} stale={v.stale} staleKind={v.data.errorKind ?? 'server'} />;
}
