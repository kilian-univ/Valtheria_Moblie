import { OpaqueScreen } from '@/src/components/common/AppBackground';
import ModuleScreen from '@/src/screens/apprendre/ModuleScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function ModuleRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <ModuleScreen />
    </OpaqueScreen>
  );
}
