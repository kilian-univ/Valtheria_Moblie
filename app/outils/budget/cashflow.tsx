import { OpaqueScreen } from '@/src/components/common/AppBackground';
import BudgetGate from '@/src/screens/budget/BudgetGate';

// Cash-flow du budget : page poussée sur la pile des outils
export default function BudgetCashflow() {
  return (
    <OpaqueScreen tab="outils">
      <BudgetGate page="cashflow" />
    </OpaqueScreen>
  );
}
