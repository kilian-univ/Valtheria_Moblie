import { OpaqueScreen } from '@/src/components/common/AppBackground';
import DiscoveryEndScreen from '@/src/screens/onboarding/DiscoveryEndScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function DiscoveryEndRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <DiscoveryEndScreen />
    </OpaqueScreen>
  );
}
