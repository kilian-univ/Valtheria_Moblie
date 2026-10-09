import { OpaqueScreen } from '@/src/components/common/AppBackground';
import CashflowScreen from '@/src/screens/CashflowScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function Cashflow() {
  return (
    <OpaqueScreen tab="outils">
      <CashflowScreen />
    </OpaqueScreen>
  );
}
