import { OpaqueScreen } from '@/src/components/common/AppBackground';
import GuestReminderScreen from '@/src/screens/onboarding/GuestReminderScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function GuestReminderRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <GuestReminderScreen />
    </OpaqueScreen>
  );
}
