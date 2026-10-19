import EmailConfirmGate from '@/src/components/account/EmailConfirmGate';
import { OpaqueScreen } from '@/src/components/common/AppBackground';
import OperationScreen from '@/src/screens/patrimoine/OperationScreen';

export default function Operation() {
  return (
    <OpaqueScreen tab="outils">
      <EmailConfirmGate title="Mon patrimoine" what="ton patrimoine">
        <OperationScreen />
      </EmailConfirmGate>
    </OpaqueScreen>
  );
}
