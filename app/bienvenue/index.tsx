import { OpaqueScreen } from '@/src/components/common/AppBackground';
import WelcomeScreen from '@/src/screens/onboarding/WelcomeScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function WelcomeRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <WelcomeScreen />
    </OpaqueScreen>
  );
}
