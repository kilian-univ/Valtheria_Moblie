import { OpaqueScreen } from '@/src/components/common/AppBackground';
import ObjectiveScreen from '@/src/screens/onboarding/ObjectiveScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function ObjectiveRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <ObjectiveScreen />
    </OpaqueScreen>
  );
}
