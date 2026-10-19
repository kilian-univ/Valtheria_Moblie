import EmailConfirmGate from '@/src/components/account/EmailConfirmGate';
import { OpaqueScreen } from '@/src/components/common/AppBackground';
import BudgetGate from '@/src/screens/budget/BudgetGate';

// Mon budget : page poussée sur la pile des outils, opaque, avec sa copie du fond commun
export default function Budget() {
  return (
    <OpaqueScreen tab="outils">
      <EmailConfirmGate title="Mon budget" what="ton budget">
        <BudgetGate />
      </EmailConfirmGate>
    </OpaqueScreen>
  );
}
