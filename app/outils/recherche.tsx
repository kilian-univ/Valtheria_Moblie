import { OpaqueScreen } from '@/src/components/common/AppBackground';
import AssetSearchScreen from '@/src/screens/patrimoine/AssetSearchScreen';

export default function Recherche() {
  return (
    <OpaqueScreen tab="outils">
      <AssetSearchScreen />
    </OpaqueScreen>
  );
}
