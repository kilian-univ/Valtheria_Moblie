import { OpaqueScreen } from '@/src/components/common/AppBackground';
import EpargneScreen from '@/src/screens/EpargneScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function Epargne() {
  return (
    <OpaqueScreen tab="outils">
      <EpargneScreen />
    </OpaqueScreen>
  );
}
