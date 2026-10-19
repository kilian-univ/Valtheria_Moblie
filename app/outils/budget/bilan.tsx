import { useLocalSearchParams } from 'expo-router';

import EmailConfirmGate from '@/src/components/account/EmailConfirmGate';
import { OpaqueScreen } from '@/src/components/common/AppBackground';
import BudgetGate from '@/src/screens/budget/BudgetGate';

// Bilan d'un mois du budget (?mois=2026-09) : page poussée sur la pile des outils
export default function BudgetBilan() {
  const { mois } = useLocalSearchParams<{ mois?: string }>();
  return (
    <OpaqueScreen tab="outils">
      <EmailConfirmGate title="Mon budget" what="ton budget">
        <BudgetGate page="bilan" month={typeof mois === 'string' ? mois : undefined} />
      </EmailConfirmGate>
    </OpaqueScreen>
  );
}
