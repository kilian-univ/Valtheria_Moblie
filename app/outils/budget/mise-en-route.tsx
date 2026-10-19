import { useLocalSearchParams } from 'expo-router';

import EmailConfirmGate from '@/src/components/account/EmailConfirmGate';
import { OpaqueScreen } from '@/src/components/common/AppBackground';
import BudgetSetupGate from '@/src/screens/budget/BudgetSetupGate';

// Mise en route du budget ; ?modifier=1 depuis Mon budget
export default function MiseEnRoute() {
  const { modifier } = useLocalSearchParams<{ modifier?: string }>();
  return (
    <OpaqueScreen tab="outils">
      <EmailConfirmGate title="Mon budget" what="ton budget">
        <BudgetSetupGate editing={modifier === '1'} />
      </EmailConfirmGate>
    </OpaqueScreen>
  );
}
