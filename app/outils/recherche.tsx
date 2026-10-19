import EmailConfirmGate from '@/src/components/account/EmailConfirmGate';
import { OpaqueScreen } from '@/src/components/common/AppBackground';
import AssetSearchScreen from '@/src/screens/patrimoine/AssetSearchScreen';

export default function Recherche() {
  return (
    <OpaqueScreen tab="outils">
      <EmailConfirmGate title="Mon patrimoine" what="ton patrimoine">
        <AssetSearchScreen />
      </EmailConfirmGate>
    </OpaqueScreen>
  );
}
