import EmailConfirmGate from '@/src/components/account/EmailConfirmGate';
import { OpaqueScreen } from '@/src/components/common/AppBackground';
import ActifScreen from '@/src/screens/patrimoine/ActifScreen';

export default function Actif() {
  return (
    <OpaqueScreen tab="outils">
      <EmailConfirmGate title="Mon patrimoine" what="ton patrimoine">
        <ActifScreen />
      </EmailConfirmGate>
    </OpaqueScreen>
  );
}
