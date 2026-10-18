import { useLocalSearchParams } from 'expo-router';

import { OpaqueScreen } from '@/src/components/common/AppBackground';
import BudgetSetupGate from '@/src/screens/budget/BudgetSetupGate';

// Mise en route du budget ; ?modifier=1 depuis Mon budget
export default function MiseEnRoute() {
  const { modifier } = useLocalSearchParams<{ modifier?: string }>();
  return (
    <OpaqueScreen tab="outils">
      <BudgetSetupGate editing={modifier === '1'} />
    </OpaqueScreen>
  );
}
