import { OpaqueScreen } from '@/src/components/common/AppBackground';
import UniversesScreen from '@/src/screens/apprendre/UniversesScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function UniversesRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <UniversesScreen />
    </OpaqueScreen>
  );
}
