import { OpaqueScreen } from '@/src/components/common/AppBackground';
import FirstNameScreen from '@/src/screens/onboarding/FirstNameScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function FirstNameRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <FirstNameScreen />
    </OpaqueScreen>
  );
}
