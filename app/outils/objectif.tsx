import EmailConfirmGate from '@/src/components/account/EmailConfirmGate';
import { OpaqueScreen } from '@/src/components/common/AppBackground';
import ObjectifScreen from '@/src/screens/patrimoine/ObjectifScreen';

export default function Objectif() {
  return (
    <OpaqueScreen tab="outils">
      <EmailConfirmGate title="Mon patrimoine" what="ton patrimoine">
        <ObjectifScreen />
      </EmailConfirmGate>
    </OpaqueScreen>
  );
}
