import { OpaqueScreen } from '@/src/components/common/AppBackground';
import UniverseScreen from '@/src/screens/apprendre/UniverseScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function UniverseRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <UniverseScreen />
    </OpaqueScreen>
  );
}
