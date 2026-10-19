import EmailConfirmGate from '@/src/components/account/EmailConfirmGate';
import { OpaqueScreen } from '@/src/components/common/AppBackground';
import AnalyseScreen from '@/src/screens/patrimoine/AnalyseScreen';

export default function Analyse() {
  return (
    <OpaqueScreen tab="outils">
      <EmailConfirmGate title="Mon patrimoine" what="ton patrimoine">
        <AnalyseScreen />
      </EmailConfirmGate>
    </OpaqueScreen>
  );
}
