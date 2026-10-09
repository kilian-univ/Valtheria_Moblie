import { OpaqueScreen } from '@/src/components/common/AppBackground';
import PortefeuilleScreen from '@/src/screens/PortefeuilleScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function Portefeuille() {
  return (
    <OpaqueScreen tab="outils">
      <PortefeuilleScreen />
    </OpaqueScreen>
  );
}
