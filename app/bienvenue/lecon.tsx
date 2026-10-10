import { OpaqueScreen } from '@/src/components/common/AppBackground';
import DiscoveryLessonScreen from '@/src/screens/onboarding/DiscoveryLessonScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function DiscoveryLessonRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <DiscoveryLessonScreen />
    </OpaqueScreen>
  );
}
