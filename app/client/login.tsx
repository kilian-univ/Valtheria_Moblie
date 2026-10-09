import { OpaqueScreen } from '@/src/components/common/AppBackground';
import LoginScreen from '@/src/screens/header/LoginScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function Login() {
  return (
    <OpaqueScreen tab="client">
      <LoginScreen />
    </OpaqueScreen>
  );
}
