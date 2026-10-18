import { router } from 'expo-router';

import { useBudgetView } from '@/src/hooks/useBudgetView';
import BudgetSetupScreen from './BudgetSetupScreen';
import BudgetStateScreen from './BudgetStateScreen';

// Mise en route ouverte depuis Mon budget (« Modifier ») : les valeurs du
// budget en place
export default function BudgetSetupGate({ editing }: { editing: boolean }) {
  const v = useBudgetView();
  const budget = v.data.budget;
  if (v.view !== 'ready' || !budget || !v.userKey) {
    return <BudgetStateScreen view={v.view === 'ready' ? 'loading' : v.view} title="Mon budget" errorKind={v.errorKind} onRetry={v.retry} />;
  }
  if (!editing && budget.settings.setupDone) {
    router.replace('/outils/budget');
    return null;
  }
  return <BudgetSetupScreen budget={budget} userKey={v.userKey} editing={editing} />;
}
