import { OpaqueScreen } from '@/src/components/common/AppBackground';
import OperationScreen from '@/src/screens/patrimoine/OperationScreen';

export default function Operation() {
  return (
    <OpaqueScreen tab="outils">
      <OperationScreen />
    </OpaqueScreen>
  );
}
