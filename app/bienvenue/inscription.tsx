import { OpaqueScreen } from '@/src/components/common/AppBackground';
import SignupScreen from '@/src/screens/onboarding/SignupScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function SignupRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <SignupScreen />
    </OpaqueScreen>
  );
}
