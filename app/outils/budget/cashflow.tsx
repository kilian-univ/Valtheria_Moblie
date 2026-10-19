import EmailConfirmGate from '@/src/components/account/EmailConfirmGate';
import { OpaqueScreen } from '@/src/components/common/AppBackground';
import BudgetGate from '@/src/screens/budget/BudgetGate';

// Cash-flow du budget : page poussée sur la pile des outils
export default function BudgetCashflow() {
  return (
    <OpaqueScreen tab="outils">
      <EmailConfirmGate title="Mon budget" what="ton budget">
        <BudgetGate page="cashflow" />
      </EmailConfirmGate>
    </OpaqueScreen>
  );
}
