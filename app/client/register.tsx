import { OpaqueScreen } from '@/src/components/common/AppBackground';
import SignupScreen from '@/src/screens/onboarding/SignupScreen';

// « Créer mon compte » depuis n'importe où : la nouvelle inscription en trois
// étapes (pseudo, compte, rappel)
export default function Register() {
  return (
    <OpaqueScreen tab="client">
      <SignupScreen />
    </OpaqueScreen>
  );
}
